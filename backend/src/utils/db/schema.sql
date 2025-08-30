-- schema.sql  (MySQL 8.0+)

-- (opțional) Creează DB și setează charset
 CREATE DATABASE IF NOT EXISTS blockchain_app CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE blockchain_app;
-- -----------------------------------------------------
-- Setări generale
-- -----------------------------------------------------
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------
-- Tipuri ENUM
-- -----------------------------------------------------
-- În MySQL poți folosi direct ENUM; dacă preferi tabele lookup, îți pot da și varianta aceea.
-- Valorile sunt validate la INSERT/UPDATE.

-- pentru locația stocării blob-ului criptat
-- ENUM('S3','IPFS','LOCAL') va fi definit direct pe coloană

-- pentru starea de criptare
-- ENUM('encrypted','decrypted') va fi definit direct pe coloană

-- -----------------------------------------------------
-- USERS
-- -----------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  eth_address   VARCHAR(42)     NOT NULL UNIQUE,   
  first_name    VARCHAR(255)    NOT NULL,
  last_name     VARCHAR(255)    NOT NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_users_eth (eth_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS photos;
CREATE TABLE photos (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  owner_address   VARCHAR(42)     NOT NULL,         
  owner_user_id   BIGINT UNSIGNED NULL,

  storage         ENUM('S3','IPFS','LOCAL') NOT NULL,
  storage_ref     TEXT            NOT NULL,         
  mime_type       VARCHAR(255)    NOT NULL,
  bytes_size      BIGINT UNSIGNED NOT NULL,

  sha256_hex      CHAR(64)        NOT NULL,         

  enc_scheme      VARCHAR(64)     NOT NULL DEFAULT 'AES-256-GCM',
  enc_status      ENUM('encrypted','decrypted') NOT NULL DEFAULT 'encrypted',
  iv_base64       TEXT            NOT NULL,         

  is_private      TINYINT(1)      NOT NULL DEFAULT 1,

  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT fk_photos_owner_user
    FOREIGN KEY (owner_user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,

  CONSTRAINT fk_photos_owner_addr
    FOREIGN KEY (owner_address) REFERENCES users(eth_address)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  INDEX idx_photos_owner_addr (owner_address),
  INDEX idx_photos_status (enc_status),
  INDEX idx_photos_storage (storage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


DROP TABLE IF EXISTS photo_keys;
CREATE TABLE photo_keys (
  photo_id          BIGINT UNSIGNED NOT NULL,
  recipient_address VARCHAR(42)     NOT NULL,                 
  wrap_version      VARCHAR(64)     NOT NULL DEFAULT 'x25519-xsalsa20-poly1305',
  wrapped_key_hex   LONGTEXT        NOT NULL,                 

  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (photo_id, recipient_address),

  CONSTRAINT fk_keys_photo
    FOREIGN KEY (photo_id) REFERENCES photos(id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  INDEX idx_keys_recipient (recipient_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS photo_access;
CREATE TABLE photo_access (
  photo_id         BIGINT UNSIGNED NOT NULL,
  grantee_address  VARCHAR(42)     NOT NULL,
  can_view         TINYINT(1)      NOT NULL DEFAULT 0,
  can_download     TINYINT(1)      NOT NULL DEFAULT 0,
  created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (photo_id, grantee_address),

  CONSTRAINT fk_acl_photo
    FOREIGN KEY (photo_id) REFERENCES photos(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


DROP VIEW IF EXISTS v_photos_with_owners;
CREATE VIEW v_photos_with_owners AS
SELECT
  p.id,
  p.owner_address,
  u.first_name,
  u.last_name,
  p.storage,
  p.storage_ref,
  p.mime_type,
  p.bytes_size,
  p.sha256_hex,
  p.enc_scheme,
  p.enc_status,
  p.iv_base64,
  p.is_private,
  p.created_at,
  p.updated_at
FROM photos p
LEFT JOIN users u ON u.eth_address = p.owner_address;

