import asyncpg
from dotenv import load_dotenv
from os import getenv
from fastapi import HTTPException

load_dotenv()
dbUrl = getenv("DB")

# testi1
class postgres:
    """SQL command execution"""

    async def __aenter__(self):
        self.pool = await asyncpg.create_pool(dbUrl)
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self.pool.close()

    # -------------------USER OPERATIONS-------------------------
    async def addUser(self, username: str):
        async with self.pool.acquire() as dbConnection:
            sql = """
            INSERT INTO USERS(username) VALUES($1)
            RETURNING ID
            """
            try:
                uId = await dbConnection.fetchval(sql, username)
            except Exception:
                return "User has not been added"
            return uId

    async def getUser(self, username: str) -> int | None:
        async with self.pool.acquire() as conn:
            data = await conn.fetchval(
                "SELECT id FROM users WHERE username = $1", username
            )
            return data  # bo fetchval zwraca int albo None

    async def rmUser(self, username: str):
        async with self.pool.acquire() as dbConnection:
            sql = """
            DELETE FROM USERS
            WHERE USERNAME = $1
            """
            try:
                await dbConnection.execute(sql, username)
            except Exception:
                return "User not deleted"
        return "User deleted"

    # ------------------------------------------------------------------
    # -----------------Container Operations-----------------------------
    # ------------------------------------------------------------------
    async def addContainer(self, containerName: str, sAccountName: str):
        """Add new container and its permissions"""
        async with self.pool.acquire() as dbConnection:
            sql = """
            INSERT INTO CONTAINERS(name,saccount) VALUES($1,$2)
            RETURNING ID
            """
            try:
                containerId = await dbConnection.fetchval(
                    sql, containerName, sAccountName
                )
            except Exception:
                raise HTTPException(
                    status_code=500, detail="Container has not been created"
                )
            return containerId

    async def getContainer(self, containerName: str):
        async with self.pool.acquire() as dbConnection:
            sql = """
            SELECT ID from CONTAINERS 
            WHERE name = $1
            """
            result = await dbConnection.fetchval(sql, containerName)
            return result

    async def getContainers(self, uId: int):
        async with self.pool.acquire() as dbConnection:
            sql = """
            SELECT NAME from CONTAINERS b
            JOIN ACL a on a.container_id = b.id
            where user_id = $1
            """
            data = await dbConnection.fetch(sql, uId)
            data = [r["name"] for r in data]
            return data

    async def rmContainer(self, containerName: str):
        """Remove container and its permissions"""
        async with self.pool.acquire() as dbConnection:
            sql = """
            DELETE FROM CONTAINERS
            WHERE NAME = $1
            """
            try:
                await dbConnection.execute(sql, containerName)
            except Exception:
                return "Container not deleted"

    # ----------------------------------------------------------------------------
    # -------------------------------ACL------------------------------------------
    # ----------------------------------------------------------------------------
    async def getACL(self, containerName: str, username: str):
        async with self.pool.acquire() as dbConnection:
            sql = """
                Select ARRAY(
                SELECT DISTINCT role from ACL 
                where user_id = (SELECT ID FROM USERS WHERE USERNAME = $1)
                and container_id = (SELECT ID FROM CONTAINERS WHERE NAME = $2)
                )
                """
            data = await dbConnection.fetchval(sql, username, containerName)
            return data or []

    async def addPermissions(self, cId: str, uId: str, acl: str | None):
        """Add new permisions to a user"""
        if acl is None:
            acl = "read"
        async with self.pool.acquire() as dbConnection:
            sql = """
            INSERT INTO ACL 
            VALUES ($1,$2,$3)
            """
            try:
                await dbConnection.execute(sql, cId, uId, acl)
            except Exception:
                raise HTTPException(status_code=500, detail="ACL has not been created")

    async def rmPermissions(self, username: str, containerName: str):
        """Remove container permissions"""
        async with self.pool.acquire() as dbConnection:
            sql = """
            DELETE FROM ACL
            WHERE USER_ID = $1 and CONTAINER_ID = $2
            """
            userId = await self.getUser(username)
            containerId = await self.getContainer(containerName)
            try:
                await dbConnection.execute(sql, userId, containerId)
            except Exception:
                return "Permissions not removed"
        return "Permissions removed"


def checkList(roles: set[str]):
    if "read" in roles or "write" in roles or "owner" in roles:
        return True
    return False


def checkWrite(roles: set[str]):
    if "write" in roles or "owner" in roles:
        return True
    return False
