CREATE DATABASE onimisea;

CREATE TABLE admins (
  id BIGSERIAL NOT NULL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(50) NOT NULL,
  phone BIGINT NOT NULL,
  password VARCHAR(1000) NOT NULL,
  role VARCHAR(15) NOT NULL 
);

CREATE TABLE portfolio (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    excerpt TEXT,
    featured_image TEXT,
    live_url VARCHAR(255),
    github_url VARCHAR(255),
    content TEXT
);

ALTER TABLE portfolio
ADD COLUMN date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
