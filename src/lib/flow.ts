import { getGranteeAddress, getJWT } from "./backend";
import { useKeplrStore } from "./keplr"
import "./storage";
import { toBase64 } from "@cosmjs/encoding";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { cosmos } from "osmojs";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";

const { grant } = cosmos.authz.v1beta1.MessageComposer.withTypeUrl;

// Prompt the user to sign a grant authorizing the swap backend (see README) to submit TXs on their behalf for 24 hours.
// This is necessary because the swap backend will combine the user's swap and the arbitrage swap into a single TX.
// This function returns a JWT. ALL subsequent API calls to the swap backend must include this JWT. 
export const authUserToBackend = async() => {
      const keplrStore = useKeplrStore();
      const arbitrageWallet = await getGranteeAddress();
      const msg = grantAuthZMsg(keplrStore.address, arbitrageWallet);
      const authZTxRaw = await keplrStore.sign(msg);
      const base64AuthZTx = getBase64Tx(authZTxRaw);
      const { token } = await getJWT({
        address: keplrStore.address || "",
        authz_grant: base64AuthZTx,
      });

      // TODO: Maybe you will want to put this token in local storage. 
      // Note that this is the JWT used with the BACKEND, not with the simulator.
      // For every subsequent web request made to the backend (for the next 24 hours), this JWT can be used. After 24 hours it will expire.
      // Once it expires you must get a new JWT by calling this function again.
      return token;
    }


export const getBase64Tx = (txRaw) => {
    const txBytes = TxRaw.encode(txRaw).finish();
    const base64 = toBase64(txBytes);
    return base64;
};

export const grantAuthZMsg = (granterAddress, granteeAddress) => {
    const grantedMsg = "/osmosis.gamm.v1beta1.MsgSwapExactAmountIn";
    return grant({
        granter: granterAddress,
        grantee: granteeAddress,
        grant: {
            // @ts-ignore
            authorization: {
                typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization",
                value: GenericAuthorization.encode(
                GenericAuthorization.fromPartial({
                    msg: grantedMsg,
                })
                ).finish(),
            },
            // limit grant to 24 hours
            expiration: new Date(Date.now() + 60 * 60 * 24 * 1000),
        }
    });
};