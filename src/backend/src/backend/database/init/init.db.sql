CREATE DATABASE FILE_MANAGER_ACL;

CREATE TABLE USERS (
    ID SERIAL PRIMARY KEY,
    username varchar(100) UNIQUE,
    deleted_at timestamp
);

CREATE TABLE CONTAINERS(
    ID SERIAL PRIMARY KEY,
    name varchar(100) UNIQUE NOT NULL,
    saccount varchar(100) NOT NULL
);


CREATE TABLE ACL(
    container_id int references containers(id) ON DELETE CASCADE,
    user_id int references users(id) ON DELETE CASCADE,
    role varchar(10) NOT NULL DEFAULT 'read',
    PRIMARY KEY (container_id,user_id)
);