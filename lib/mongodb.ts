import { MongoClient, type Db } from "mongodb";

const globalMongo = globalThis as typeof globalThis & {
  __checkhooksMongoClient?: MongoClient;
  __checkhooksMongoPromise?: Promise<MongoClient | null>;
};

export function getMongoUrl() {
  return process.env.MONGODB_URI || process.env.MONGO_URL || "";
}

export async function getMongoClient() {
  const uri = getMongoUrl();
  if (!uri) return null;
  if (globalMongo.__checkhooksMongoClient) return globalMongo.__checkhooksMongoClient;
  if (globalMongo.__checkhooksMongoPromise) return globalMongo.__checkhooksMongoPromise;

  globalMongo.__checkhooksMongoPromise = (async () => {
    try {
      const client = new MongoClient(uri);
      await client.connect();
      globalMongo.__checkhooksMongoClient = client;
      return client;
    } catch (error) {
      console.error("Unable to connect to MongoDB", error);
      globalMongo.__checkhooksMongoPromise = undefined;
      return null;
    }
  })();

  return globalMongo.__checkhooksMongoPromise;
}

export async function getCheckhooksDb(): Promise<Db | null> {
  const client = await getMongoClient();
  return client?.db(process.env.MONGODB_DB || "checkhooks") ?? null;
}
