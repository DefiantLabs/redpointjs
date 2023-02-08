import { getGranteeAddress, getJWT } from "./backend";
import { useKeplrStore } from "./keplr"
import "./storage";
import { toBase64 } from "@cosmjs/encoding";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { cosmos } from "osmojs";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";

const { grant } = cosmos.authz.v1beta1.MessageComposer.withTypeUrl;

export const redpointSignin = async() => {
      const keplrStore = useKeplrStore();
      const arbitrageWallet = await getGranteeAddress();
      const msg = grantAuthZMsg(keplrStore.address, arbitrageWallet);
      const authZTxRaw = await keplrStore.sign(msg);
      const base64AuthZTx = getBase64Tx(authZTxRaw);
      const { token } = await getJWT({
        address: keplrStore.address || "",
        authz_grant: base64AuthZTx,
      });

      // ... TODO: Presumably you will want to put the token in local storage ... 
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