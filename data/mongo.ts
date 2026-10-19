import { MongoClient } from "mongodb";
const shared = globalThis as unknown as { biotestMongo?: Promise<MongoClient> };
export async function getMongoClient() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is required");
  shared.biotestMongo ??= new MongoClient(uri).connect().catch(error => { shared.biotestMongo = undefined; throw error; });
  return await shared.biotestMongo;
}

export async function getMongoDb() { return (await getMongoClient()).db(); }
