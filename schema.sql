CREATE TABLE `house` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(64) DEFAULT NULL,
  `price` int(11) DEFAULT NULL,
  `propertyType` varchar(64) DEFAULT NULL,
  `decoration` varchar(64) DEFAULT NULL,
  `buildingType` varchar(64) DEFAULT NULL,
  `propertyRight` varchar(64) DEFAULT NULL,
  `developmentCo` varchar(64) DEFAULT NULL,
  `address` varchar(128) DEFAULT NULL,
  `households` int(8) DEFAULT NULL,
  `saleTime` varchar(64) DEFAULT NULL,
  `deliveryTime` varchar(64) DEFAULT NULL,
  `city` varchar(32) DEFAULT NULL,
  `star` float DEFAULT NULL,
  `comment` int(6) DEFAULT NULL,
  `propertyCo` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;