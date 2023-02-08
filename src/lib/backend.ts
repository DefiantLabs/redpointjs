/*
   Redpoint Backend is what submits trades to the chain. To do so you'll need a valid JWT proving the user owns the given address.
   See flow.ts which can submit a signed grant to the backend, which will return the JWT.
*/
import { SimulatedSwapRequest } from "./simulator";
import axios from "axios";

//You'll need to run the Redpoint swap backend locally and change this URL to whatever port it's listening at.
//Redpoint swap backend can be found at: https://github.com/DefiantLabs/RedpointSwap.
//The purpose of running the backend is to submit trades (in production, you'd run it as a container or something).
//For test purposes, run on localhost and modify this URL. 
const backendUrl = "http://localhost:3000/api";

const api = axios.create({
  baseURL: backendUrl,
});

export type AuthzGranteeResponse = {
  granteeAddress: string;
};

export type TokenRequest = {
  address: string;
  authz_grant: string; //base 64 encoded TX granting the arbitrage wallet ability to perform MsgSwapExactAmountIn
};

export type TokenResponse = {
  token: string; //The JWT with the user's address (provided in the TokenRequest). Allows the user to perform swaps.
};

export type SwapResponse = {
  txhash: string; //The TX hash of the authz TX that the backend submitted on the user's behalf.
};

export const getJWT = async (req: TokenRequest): Promise<TokenResponse> => {
  const res = await api.post<TokenResponse>("/token", req);
  return res.data;
};

export const getGranteeAddress = async (): Promise<AuthzGranteeResponse> => {
  const res = await api.get<AuthzGranteeResponse>("/grantee");
  return res.data;
};

//Execute an Authz swap
export const executeAuthzSwap = async (
  swapRequest: SimulatedSwapRequest,
  jwt: string
): Promise<SwapResponse> => {
  try {
    const res = await api.post("/secured/authz", swapRequest, {
      headers: {
        Authorization: jwt,
      },
    });
    return res.data;
  } catch (err) {
    if (!err.response) throw new Error(err.message);

    // if not authorized, remove jwt and try again
    if (err.response.status === 400) {
      throw Error(err.response.data.error);
    }
    throw Error(err.response.data.error);
  }
};
