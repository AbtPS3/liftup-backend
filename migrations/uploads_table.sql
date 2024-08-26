CREATE TABLE tepi_stats.uploads
(
    id uuid NOT NULL,
    user_base_entity_id character varying(200) NOT NULL,
    username character varying(50) NOT NULL,
    uploaded_file character varying(200) NOT NULL,
    uploaded_file_type character varying(50) NOT NULL,
    imported_rows integer NOT NULL DEFAULT 0,
    rejected_rows integer NOT NULL DEFAULT 0,
    upload_date timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT id PRIMARY KEY (id)
);

ALTER TABLE IF EXISTS tepi_stats.uploads
    OWNER to postgres;
