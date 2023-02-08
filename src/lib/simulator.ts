/*
    SIMULATOR:

    The simulator runs as a containerized web server provided by Defiant Labs.
    Clients (e.g., someone running this javascript library) can submit a trade simulation request to the simulator.
    To do so, as a first step, the library will call getToken first (see below) which will give you a JWT.
    The JWT will be provided in all other requests.

    Once a trade has been simulated, you can submit it to the Backend. The Backend is a go app that knows how to
    submit trades using Authz. See backend.ts.
*/

import axios, { AxiosInstance } from "axios";
import { Coin } from "@cosmjs/amino";
import { osmosis } from "osmojs";
import "../scripts/localstorage-polyfill";

const defiantlabsUrl = "https://osmosis-mev.apis.defiantlabs.net/api/";
export const arbitrage_wallet = "osmo14mmus5h7m6vkp0pteks8wawaj4wf3sx7fy3s2r";

// @ts-ignore define localstorage for node
let token = localStorage.getItem("defiant-simulator-jwt");

export type SwapSimulationRequest = {
  TokenInSymbol: string;
  TokenOutSymbol: string;
  TokenInAmount: string;
  TokenOutMinAmount: string;
  SkipWalletFundsCheck?: boolean; //true means the backend will verify the user wallet has funds to do the TX they are simulating. defaults to false on the backend.
  UserWallet: string; //if specified, behavior in SkipWalletFundsCheck will be followed (check user account balance before simulating a swap).
  ArbitrageWallet: string;
};

type SimulatedSwap = {
  // Will be the exact amount/denomination to submit on-chain for the trade
  TokenIn: Coin;
  // Will be the exact amount to submit on-chain as the minimum amount out for the trade
  TokenOutMinAmount: Number;
  //Comma separated list of pools that will be traded through (only for human readable info)
  Pools: string;
  // The exact routes to use for the trade. These are the gamm routes used by Osmosis DEX.
  // example: [{"pool_id":1,"token_out_denom":"uosmo"}]
  routes: typeof osmosis.poolmanager.v1beta1.SwapAmountInRoute[];
  // Will be the simulated amount that will be received when this trade is submitted to the chain.
  TokenOutAmount: Number;
  // One of the 'denom' from asset lists at https:// github.com/osmosis-labs/assetlists/tree/main/osmosis-1
  TokenOutDenom: string;
  // One of the 'symbol' from asset lists at https:// github.com/osmosis-labs/assetlists/tree/main/osmosis-1
  TokenInSymbol: string;
  // example: 165.1269 OSMO
  AmountOutHumanReadable: string;
  // One of the 'symbol' from asset lists at https:// github.com/osmosis-labs/assetlists/tree/main/osmosis-1
  TokenOutSymbol: string;
  // example: 165.1269
  BaseAmount: string;
  // Amount this trade impacts the pool prices. For example, .025 would mean a 2.5% impact.
  // example: .025
  PriceImpact: Number;
};

type ArbitrageSwap = {
  // the arbitrage swap including the most efficient routes (pools) to use
  SimulatedSwap: SimulatedSwap;
  // e.g. 165.1269 OSMO
  //
  // example: 165.1269 OSMO
  EstimatedProfitHumanReadable: string;
  // e.g. 165.1269
  //
  // example: 165.1269
  EstimatedProfitBaseAmount: string;
};

export type SimulatedSwapResult = {
  // the user's swap including the most efficient routes (pools) to use
  userSwap: SimulatedSwap;
  // how much arbitrage the user's swap will cause, routes to use, etc
  arbitrageSwap?: ArbitrageSwap;
  // Whether or not the user's swap will cause arbitrage once executed on chain
  HasArbitrageOpportunity: boolean;
  // if there was some issue detected on the server
  Error: string;
};

export interface SimulatedSwapRequest extends SimulatedSwapResult {
  UserAddress: string;
}

export const api: AxiosInstance = axios.create({
  baseURL: defiantlabsUrl,
});

const getToken = async (address: string) => {
  if (token) return token;
  const {
    data: { token: _token },
  } = await api.post("/token?partnerSecret={YOUR_SECRET}", { address });
  // @ts-ignore define localstorage for node
  localStorage.setItem("defiant-simulator-jwt", _token);
  token = _token;
};

export const estimateSwap = async (
  req: SwapSimulationRequest
): Promise<SimulatedSwapResult> => {
  if (!token) {
    await getToken(req.UserWallet);
  }

  //TODO: we will want to look this up from the Redpoint backend
  if (req.ArbitrageWallet == "") {
    req.ArbitrageWallet = arbitrage_wallet;
  }

  let jwt: string = token || "";

  const res = await api
    .post<SimulatedSwapResult>("/secured/estimateswap", req, {
      headers: {
        Authorization: jwt,
      },
    })
    .catch(async (err) => {
      if (!err.response) throw new Error(err.message);

      // if not authorized, remove jwt and try again
      if (err.response.status === 401) {
        token = null;
        // @ts-ignore define localstorage for node
        localStorage.removeItem("defiant-simulator-jwt");
        return { data: await estimateSwap(req) };
      }
      throw Error(err.response.data.error);
    });

  return res.data;
};
