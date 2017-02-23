'use strict';

const Crawler = require("crawler");
const url = require('url');
const _ = require('lodash');
const path = require('path');
const db = require('./db');
const uaString = require('ua-string');

db.connect();

const c = new Crawler({
    maxConnections: 1,
    rateLimit: 15000, // gap 15 sec
    limiter: 'list',
    timeout: 45000,
    userAgent: uaString
});

const listFetcher = (error, res, done) => {

    if(error){
        console.log(error);
    }else{
        let $ = res.$
        let nextPageEl = $('.page a.next');

        //has next page?
        if(nextPageEl.length > 0){

            let nextPage = nextPageEl.attr("href");
            nextPage = url.resolve(res.options.uri, nextPage);
            c.queue([
                {
                    uri: nextPage,
                    callback: listFetcher,
                    city: res.options.city,
                    limiter: 'list'
                }
            ])
        }

        let processors = _.filter($('.nl_con li .nlcd_name a'), (link) => {
            let uri = link.attribs.href;
            return ~uri.indexOf("http");
        }).map((link)=>{
            return {
                uri: link.attribs.href,
                callback: houseProcessor,
                city: res.options.city,
                priority: 3,
                maxConnections: 1,
                rateLimit: 20000, // gap 20 sec
                limiter: 'detail'
            }
        });

        // process house detail
        c.queue(processors);
        
    }
    done();
}

c.queue([
    // 南昌
    {
        uri: 'http://newhouse.nc.fang.com/house/s/a77-b81/',
        callback: listFetcher,
        city: '南昌'
    },
    // 合肥
    {
        uri: 'http://newhouse.hf.fang.com/house/s/a77-b80/',
        callback: listFetcher,
        city: '合肥'
    },
    // 苏州
    {
        uri: 'http://newhouse.suzhou.fang.com/house/s/a77-b80/',
        callback: listFetcher,
        city: '苏州'
    },
    // 嘉兴
    {
        uri: 'http://newhouse.jx.fang.com/house/s/a77-b80/',
        callback: listFetcher,
        city: '嘉兴'
    },
    // 长春
    {
        uri: 'http://newhouse.changchun.fang.com/house/s/a77-b80/',
        callback: listFetcher,
        city: '长春'
    },
    // 武汉
    {
        uri: 'http://newhouse.wuhan.fang.com/house/s/a77-b80/',
        callback: listFetcher,
        city: '武汉'
    }
]);

c.on('drain',function(){
    db.end();// close connection to MySQL
    console.log('done!');
});

c.on('request',function(options){
    let now = Date();
    console.log (`${now}[request][${options.city}]${options.uri}`);
});

const houseProcessor = (error, res, done) => {
    if(error) {
        console.log(error);
    }else{
        let $ = res.$;
        let detailLinkEl = _.find($('.navleft a'), (el)=>{
            return ~el.children[0].data.indexOf("楼盘详情");
        });
        let now = Date();

        c.queue({
            uri: detailLinkEl.attribs.href,
            callback: detailProcessor,
            city: res.options.city,
            priority: 1,
            maxConnections: 1,
            rateLimit: 20000, // gap 20 sec
            limiter: 'detail'
        });


    }
    done();
}

const detailProcessor = (error, res, done) => {
    if(error) {
        console.log(error);
        done();
    }else{
        let $ = res.$;
        let detail = {};
        let name = $('h1').text();
        let price = $('.main-info-price em').text();
        let comment = $('.main-info-comment .comment span').text();
        let infoReg = /([\s\S]*)：([\s\S]*)/;
        let priceReg = /\d+/;
        let commentReg = /(\d+\.\d+)\[(\d+)/;
        let now = Date();

        console.log (`${now}[fetching][${res.options.city}]${name}`);

        detail.name = name
        if(priceReg.exec(price)){
            detail.price = priceReg.exec(price)[0] - 0;
        }
        if(commentReg.exec(comment)){
            detail.star = commentReg.exec(comment)[1] - 0;
            detail.comment = commentReg.exec(comment)[2] - 0;
        }
        detail.city = res.options.city;

        $('.main-item ul li').each((i,info) => {
            
            let pair = infoReg.exec($(info).text());
            
            if(pair){
                let key = _.trim(pair[1]).split(' ').join('');
                let val = _.trim(pair[2]).split(' ').join('');
                let attr = _mapInfoAttribute(key,val);
                if(attr) {
                    detail[attr.key] = attr.val;
                }
            }
        });


        db.query('INSERT INTO house SET ?', detail, (err,result, fields) =>{
            if(error){
                console.log(error);
            }
            done();
        });
    }
    
}

const _mapInfoAttribute = (chs,val) => {


    let mapper = {
        '物业类别': {
            attr: 'propertyType',
            val: val
        },
        '装修状况': {
            attr: 'decoration',
            val: val
        },
        '建筑类别': {
            attr: 'buildingType',
            val: val.replace(/\n[\t]*/,'-')
        },
        '产权年限': {
            attr: 'propertyRight',
            val: ((val)=>{
                val = val.replace('年','') - 0;
                return typeof val == 'number' ? val : 0;
            })(val)
        },
        '开发商': {
            attr: 'developmentCo',
            val: val
        },
        '楼盘地址': {
            attr: 'address',
            val: val
        },
        '开盘时间': {
            attr: 'saleTime',
            val: val
        },
        '交房时间': {
            attr: 'deliveryTime',
            val: val
        },
        '总户数': {
            attr: 'households',
            val: ((val)=>{
                val = val.replace('户','') - 0;
                return typeof val == 'number' ? val : 0;
            })(val)
        },
        '物业公司': {
            attr: 'propertyCo',
            val: val
        }
    }

    if(mapper[chs]){
        return {
            key: mapper[chs].attr,
            val: mapper[chs].val
        }
    }else{
        return null;
    }
}