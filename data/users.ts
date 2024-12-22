import prisma from "@/data/prisma";

export const getUsers = async () => {
  const users = await prisma.user.findMany({
    select: {
      name: true,
      username: true,
      password: true
    }
  })
  return users
}