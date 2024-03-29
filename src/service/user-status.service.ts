import redisClient from "../config/redis.config";
import { getLogger } from "../provider/logger";

const ONLINE_USERS_SET = "online-users";
const log = getLogger("user-status.service");

const setOnline = async (userId: number) => {
  try {
    await redisClient.sAdd(ONLINE_USERS_SET, userId.toString());
    log.info(`User with ID ${userId} is now online.`);
  } catch (error) {
    log.error(`Error setting user with ID ${userId} online: ${error}`);
  }
};

const setOffline = async (userId: number) => {
  try {
    await redisClient.sRem(ONLINE_USERS_SET, userId.toString());
    log.info(`User with ID ${userId} is now offline.`);
  } catch (error) {
    log.error(`Error setting user with ID ${userId} offline: ${error}`);
  }
};

const getAllOnlineUsers = async (): Promise<number[]> => {
  return (await redisClient.sMembers(ONLINE_USERS_SET)).map((s) => +s);
};

export { getAllOnlineUsers, setOffline, setOnline };
