-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "serial_number" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100),
    "auth" TEXT,
    "location" TEXT,
    "webhook_url" TEXT,
    "public_key" TEXT,
    "private_key" TEXT,
    "stamp" VARCHAR(50) DEFAULT '0',
    "op_stamp" VARCHAR(50) DEFAULT '0',
    "error_delay" INTEGER DEFAULT 60,
    "comm_key" INTEGER DEFAULT 0,
    "delay" INTEGER DEFAULT 60,
    "trans_times" TEXT DEFAULT '00:00;14:05',
    "trans_interval" INTEGER DEFAULT 1,
    "trans_flag" TEXT DEFAULT '1111000000',
    "realtime" INTEGER DEFAULT 1,
    "encryption" TEXT DEFAULT '0',
    "timezone" VARCHAR(10) DEFAULT '7',
    "firmware_version" VARCHAR(100),
    "total_users" INTEGER DEFAULT 0,
    "total_fingerprints" INTEGER DEFAULT 0,
    "total_attendances" INTEGER DEFAULT 0,
    "ip_address" VARCHAR(100),
    "port_udp" VARCHAR(10) DEFAULT '4370',
    "port_tcp" VARCHAR(10) DEFAULT '80',
    "status_udp" INTEGER DEFAULT 0,
    "mac_address" VARCHAR(100),
    "fingerprint_algorithm" VARCHAR(100),
    "face_algorithm" VARCHAR(100),
    "total_faces" INTEGER DEFAULT 0,
    "total_faces_enrolled" INTEGER DEFAULT 0,
    "feature_support" TEXT,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commands" (
    "id" SERIAL NOT NULL,
    "device_id" INTEGER NOT NULL,
    "command" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" SERIAL NOT NULL,
    "device_id" INTEGER NOT NULL,
    "user_id" VARCHAR(50),
    "type" VARCHAR(100),
    "timestamp" TEXT,
    "timestamp_utc" TIMESTAMP(0),
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_users" (
    "id" SERIAL NOT NULL,
    "device_id" INTEGER NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "name" TEXT,
    "privilege" INTEGER DEFAULT 0,
    "password" TEXT,
    "main_card" TEXT,
    "vice_card" TEXT,
    "group" INTEGER DEFAULT 0,
    "template" TEXT,
    "verify_type" INTEGER DEFAULT 0,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" SERIAL NOT NULL,
    "device_id" INTEGER NOT NULL,
    "user_id" VARCHAR(50),
    "fid" VARCHAR(50),
    "size" INTEGER,
    "valid" BOOLEAN DEFAULT true,
    "encode" TEXT,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deviceUserId" INTEGER,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" SERIAL NOT NULL,
    "device_id" INTEGER NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "timestamp" TEXT NOT NULL,
    "timestamp_utc" TIMESTAMP(0),
    "status" INTEGER,
    "verify" INTEGER DEFAULT 1,
    "workcode" INTEGER DEFAULT 0,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failed_webhooks" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "signature" VARCHAR(255) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_retry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failed_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "devices_serial_number_key" ON "devices"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "device_users_device_id_user_id_key" ON "device_users"("device_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "templates_device_id_user_id_fid_key" ON "templates"("device_id", "user_id", "fid");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_device_id_user_id_timestamp_key" ON "attendances"("device_id", "user_id", "timestamp");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commands" ADD CONSTRAINT "commands_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_users" ADD CONSTRAINT "device_users_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_deviceUserId_fkey" FOREIGN KEY ("deviceUserId") REFERENCES "device_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
