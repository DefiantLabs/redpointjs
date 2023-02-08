import { defineStore } from "pinia";
import { GasPrice, calculateFee, StdFee } from '@cosmjs/stargate';
import { getSigningOsmosisClient } from 'osmojs';
declare var localStorage: any
declare var window: any

const chainId = 'osmosis-1'
const rpcEndpoint = 'https://rpc.osmosis.zone/'

const defaultGasPrice = GasPrice.fromString('0.05uosmo')

export const useKeplrStore = defineStore("keplrStor", {
  // convert to a function
  state: () => ({
    name: null,
    address: null,
    signingClient: null
  }),
  getters: {
    isLoggedIn: (state) => state.address !== null,
  },
  actions: {
    autoLogIn() {
      if (localStorage.getItem('signedIn')) {
        this.logInUser()
      }
    },
    async logInUser() {
      await new Promise(resolve => setTimeout(resolve, 300))
      // await addChain();

      // Enabling before using the Keplr is recommended.
      // This method will ask the user whether or not to allow access if they haven't visited this website.
      // Also, it will request user to unlock the wallet if the wallet is locked.
      // @ts-ignore
      await window.keplr.enable(chainId);

      const {
        name,
        bech32Address
      // @ts-ignore
      } = await window.keplr.getKey(chainId);

      localStorage.setItem('signedIn', "true")

      this.name = name;
      this.address = bech32Address;

      // @ts-ignore
      const offlineSigner = await window.getOfflineSigner(chainId);

      // @ts-ignore
      this.signingClient = await getSigningOsmosisClient({
        rpcEndpoint,
        signer: offlineSigner // OfflineSigner
      });
    },
    /**
     *
     * @param data
     */
    async logoutUser() {
      this.name = null;
      this.address = null;
    },
    async sign(msg) {
      const defaultSwapFee: StdFee = calculateFee(60_000, defaultGasPrice)
      // @ts-ignore
      const response = await this.signingClient.sign(this.address, [msg], defaultSwapFee);
      if (response.code) {
        throw new Error(response.rawLog)
      }
      return response
    },
    async signAndBroadcast(msg) {
      const defaultSwapFee: StdFee = calculateFee(60_000, defaultGasPrice)
      // @ts-ignore
      const response = await this.signingClient.signAndBroadcast(this.address, [msg], defaultSwapFee);
      if (response.code) {
        throw new Error(response.rawLog)
      }
      return response
    }
  }
});

window.addEventListener("keplr_keystorechange", () => {
  const keplrStore = useKeplrStore()
  keplrStore.autoLogIn()
})