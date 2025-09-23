"""Validation of Entra ID JWT token"""

from jwt import decode, PyJWKClient, PyJWTError
from dotenv import load_dotenv
from os import getenv
from fastapi import HTTPException

load_dotenv()

tenantUrl = getenv("tenantUrl")
iss = getenv("issuer")
aud = getenv("audience")


def tokenValidation(entraToken: str):
    entraJWT = PyJWKClient(tenantUrl)

    entraDecryptData = entraJWT.get_signing_key_from_jwt(entraToken)

    try:
        tokenDecoded = decode(
            entraToken,
            entraDecryptData.key,
            entraDecryptData.algorithm_name,
            audience=aud,
        )
        return tokenDecoded["upn"]
    except PyJWTError:
        # to-do: logging errors
        return HTTPException(status_code="401", detail="Invalid Token")
