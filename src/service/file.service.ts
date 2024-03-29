import minioClient from "../config/minio.config";
import { getLogger } from "../provider/logger";
import prisma from "../config/prisma.config";
import { UploadedFile } from "express-fileupload";
import { Response } from "express";
import NotFoundError from "../model/error/not-found.error";

const USER_PROFILE_IMAGE_BUCKET = "user-profile-image-node";
const log = getLogger("file.service");

const uploadUserAvatar = async (
  file: UploadedFile,
  userId: number
): Promise<void> => {
  const user = await prisma.user.findFirst({ where: { id: userId } });

  if (user === null) {
    throw new NotFoundError("user", userId);
  }

  if (user.avatar !== null) {
    await minioClient.removeObject(USER_PROFILE_IMAGE_BUCKET, user.avatar);
  }

  const fileKey = `${user.id}/${file.name}`;

  await minioClient.putObject(USER_PROFILE_IMAGE_BUCKET, fileKey, file.data);

  log.info(`uploaded new profile image by user with id ${userId}`);
  await prisma.user.update({
    data: {
      avatar: fileKey,
    },
    where: {
      id: userId,
    },
  });
};

const downloadUserAvatar = async (
  userId: number,
  res: Response
): Promise<void> => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
  });

  if (user === null) {
    throw new NotFoundError("user", userId);
  }

  if (!user.avatar) {
    res.status(404).send("User does not have an avatar");
    return;
  }

  const data = await minioClient.getObject(
    USER_PROFILE_IMAGE_BUCKET,
    user.avatar
  );

  res.setHeader("Content-disposition", `attachment; filename=${user.avatar}`);
  res.setHeader("Content-type", "application/octet-stream");

  data.pipe(res);
};

const checkBuckets = async () => {
  const userProfileImageBucketIsExists = await minioClient.bucketExists(
    USER_PROFILE_IMAGE_BUCKET
  );

  if (!userProfileImageBucketIsExists) {
    await minioClient.makeBucket(USER_PROFILE_IMAGE_BUCKET);
    log.info("USER_PROFILE_IMAGE_BUCKET successfully created");
  } else {
    log.info("USER_PROFILE_IMAGE_BUCKET already exists");
  }
};

export { downloadUserAvatar, uploadUserAvatar, checkBuckets };
