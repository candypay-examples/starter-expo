import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import * as Random from "expo-random";
global.ExpoRandom = global.ExpoRandom || Random;
import bs58 from "bs58";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Buffer } from "buffer";
import * as Linking from "expo-linking";
import {
  Alert,
  Button,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import nacl from "tweetnacl";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import axios, { AxiosRequestConfig } from "axios";
import { MAINNET_TOKENS, MainnetTokens } from "./tokens";
import { RadioButton, ActivityIndicator } from "react-native-paper";
import TokenCard from "./tokenCard";
import topImage from "./assets/logo.png";
import middleImage from "./assets/image.png";
import bottomImage from "./assets/image_1.png";
import DropDownPicker from "react-native-dropdown-picker";
import { fetchTokenPrices } from "./fetchTokenPrice";

const buildUrl = (path, params) =>
  `https://phantom.app/ul/v1/${path}?${params.toString()}`;
const PAY_API_URL = "https://pay.candypay.fun";
const DEV_API_URL = "https://checkout-development.up.railway.app";
const API_URL = "https://candypay-checkout-production.up.railway.app";

const reference = Keypair.generate();

export default function App() {
  const [deepLink, setDeepLink] = useState("");
  const [logs, setLogs] = useState();
  // store dappKeyPair, sharedSecret, session and account SECURELY on device
  // to avoid having to reconnect users.
  const [dappKeyPair] = useState(nacl.box.keyPair());
  const [sharedSecret, setSharedSecret] = useState();
  const [session, setSession] = useState();
  const [phantomWalletPublicKey, setPhantomWalletPublicKey] = useState();
  const [value, setValue] = useState("sol");
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(25);

  const [open, setOpen] = useState(false);
  const [option, setOption] = useState(1);
  const [items, setItems] = useState([
    { label: "1 month", value: 1 },
    { label: "2 month", value: 2 },
    { label: "3 month", value: 3 },
    { label: "4 month", value: 4 },
    { label: "5 month", value: 5 },
  ]);

  useEffect(() => {
    (async () => {
      const initialUrl = await Linking.getInitialURL();
      console.log(initialUrl);
      if (initialUrl) {
        setDeepLink(initialUrl);
      }
    })();
    Linking.addEventListener("url", handleDeepLink);
  }, []);

  const handleDeepLink = ({ url }) => {
    setDeepLink(url);
  };

  // handle inbounds links
  useEffect(() => {
    console.log("handle inbounds links");
    if (!deepLink) return;

    const url = new URL(deepLink);
    const params = url.searchParams;

    if (params.get("errorCode")) {
      console.log(JSON.stringify(Object.fromEntries([...params]), null, 2));
      return;
    }

    if (/onConnect/.test(url.pathname)) {
      console.log("connected");
      const sharedSecretDapp = nacl.box.before(
        bs58.decode(params.get("phantom_encryption_public_key")),
        dappKeyPair.secretKey
      );

      const connectData = decryptPayload(
        params.get("data"),
        params.get("nonce"),
        sharedSecretDapp
      );

      setSharedSecret(sharedSecretDapp);
      setSession(connectData.session);
      setPhantomWalletPublicKey(new PublicKey(connectData.public_key));
      Alert.alert("Connected!");
    } else if (/onDisconnect/.test(url.pathname)) {
      console.log("Disconnected!");
    } else if (/onSignAndSendTransaction/.test(url.pathname)) {
      const signAndSendTransactionData = decryptPayload(
        params.get("data"),
        params.get("nonce"),
        sharedSecret
      );

      console.log(JSON.stringify(signAndSendTransactionData, null, 2));

      const result = JSON.stringify(signAndSendTransactionData, null, 2);

      if (Object.keys(result).includes("signature")) {
        Alert.alert("Transaction successful");
      } else {
        Alert.alert("Error, please check logs");
      }
    } else if (/onSignAllTransactions/.test(url.pathname)) {
      const signAllTransactionsData = decryptPayload(
        params.get("data"),
        params.get("nonce"),
        sharedSecret
      );

      const decodedTransactions = signAllTransactionsData.transactions.map(
        (t) => Transaction.from(bs58.decode(t))
      );

      console.log(JSON.stringify(decodedTransactions, null, 2));
    } else if (/onSignTransaction/.test(url.pathname)) {
      const signTransactionData = decryptPayload(
        params.get("data"),
        params.get("nonce"),
        sharedSecret
      );

      const decodedTransaction = Transaction.from(
        bs58.decode(signTransactionData.transaction)
      );

      console.log(JSON.stringify(decodedTransaction, null, 2));
    } else if (/onSignMessage/.test(url.pathname)) {
      const signMessageData = decryptPayload(
        params.get("data"),
        params.get("nonce"),
        sharedSecret
      );

      console.log(JSON.stringify(signMessageData, null, 2));
    }
  }, [deepLink]);

  const connect = async () => {
    const params = new URLSearchParams({
      dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
      cluster: "mainnet-beta",
      app_url: "https://phantom.app",
      redirect_link: Linking.createURL("onConnect"),
    });

    const url = buildUrl("connect", params);
    Linking.openURL(url);
  };

  const buy = async () => {
    setLoading(true);
    console.log("creating txn");
    const transaction = await generateTxn(
      value,
      amount,
      phantomWalletPublicKey
    );

    console.log("serialise txn");

    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
    });

    const payload = {
      session,
      transaction: bs58.encode(serializedTransaction),
    };
    console.log("encrypt txn");

    const [nonce, encryptedPayload] = encryptPayload(payload, sharedSecret);

    const params = new URLSearchParams({
      dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
      nonce: bs58.encode(nonce),
      redirect_link: Linking.createURL("onSignAndSendTransaction"),
      payload: bs58.encode(encryptedPayload),
    });

    console.log("Sending transaction...");
    const url = buildUrl("signAndSendTransaction", params);
    Linking.openURL(url);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Image style={styles.topLogo} source={topImage} />
      <Image style={styles.middleLogo} source={middleImage} />
      <Image style={styles.bottomLogo} source={bottomImage} />
      {phantomWalletPublicKey != null &&
        phantomWalletPublicKey != undefined && (
          <View style={styles.radioGroup}>
            <View
              style={{
                width: "33%",
              }}
              onTouchStart={() => {
                setValue("sol");
              }}
            >
              <TokenCard checked={value === "sol"} token={"SOL"} />
            </View>
            <View
              style={{
                width: "33%",
              }}
              onTouchStart={() => {
                setValue("usdc");
              }}
            >
              <TokenCard checked={value === "usdc"} token={"USDC"} />
            </View>
            <View
              style={{
                width: "33%",
              }}
              onTouchStart={() => {
                setValue("hnt");
              }}
            >
              <TokenCard checked={value === "hnt"} token={"HNT"} />
            </View>
          </View>
        )}
      {phantomWalletPublicKey != null &&
        phantomWalletPublicKey != undefined && (
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#1a1a1a",
              width: "80%",
              alignSelf: "center",
              borderRadius: 16,
              marginBottom: 16,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <Text
              style={{
                fontWeight: 700,
                fontSize: 20,
                color: "white",
              }}
            >
              ${amount}
            </Text>
            <DropDownPicker
              style={{
                backgroundColor: "#4b4b4b",
                width: 124,
                alignSelf: "flex-end",
                marginRight: "15%",
              }}
              textStyle={{
                fontWeight: 700,
                fontSize: 16,
                color: "white",
              }}
              theme="DARK"
              open={open}
              value={option}
              items={items}
              setOpen={setOpen}
              setValue={setOption}
              setItems={setItems}
              onChangeValue={(value) => {
                if (value) {
                  setAmount(25 * value);
                }
              }}
            />
          </View>
        )}
      <Pressable
        style={styles.button}
        onPress={async () => {
          if (
            phantomWalletPublicKey != null &&
            phantomWalletPublicKey != undefined
          ) {
            console.log(value);
            buy();
          } else {
            connect();
          }
        }}
      >
        <Text style={styles.buttonText}>
          {phantomWalletPublicKey != null && phantomWalletPublicKey != undefined
            ? "Pay now"
            : "Connect Wallet"}
        </Text>
        {loading && <ActivityIndicator animating={true} color={"black"} />}
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
  topLogo: {
    flex: 1,
    width: null,
    height: null,
    resizeMode: "contain",
    marginHorizontal: 64,
    marginTop: -100,
  },
  bottomLogo: {
    flex: 1,
    width: null,
    height: null,
    resizeMode: "contain",
    marginHorizontal: 12,
    marginTop: -200,
  },
  middleLogo: {
    flex: 1,
    width: null,
    height: null,
    resizeMode: "contain",
    marginHorizontal: 42,
    marginTop: -280,
  },
  button: {
    backgroundColor: "white",
    width: "80%",
    alignSelf: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 16,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 64,
  },
  buttonText: {
    color: "#1a1a1a",
    fontWeight: 700,
    fontSize: 20,
  },
  radioGroup: {
    display: "flex",
    flexDirection: "row",
    margin: 8,
    width: "80%",
    marginLeft: "auto",
    marginRight: "auto",
  },
  radioBtn: {
    borderStyle: "solid",
    borderColor: "#000000",
    borderWidth: 3,
    margin: 4,
  },
});

const decryptPayload = (data, nonce, sharedSecret) => {
  if (!sharedSecret) throw new Error("missing shared secret");

  const decryptedData = nacl.box.open.after(
    bs58.decode(data),
    bs58.decode(nonce),
    sharedSecret
  );
  if (!decryptedData) {
    throw new Error("Unable to decrypt data");
  }
  return JSON.parse(Buffer.from(decryptedData).toString("utf8"));
};

const encryptPayload = (payload, sharedSecret) => {
  if (!sharedSecret) throw new Error("missing shared secret");

  const nonce = nacl.randomBytes(24);

  const encryptedPayload = nacl.box.after(
    Buffer.from(JSON.stringify(payload)),
    nonce,
    sharedSecret
  );

  return [nonce, encryptedPayload];
};

const generateTxn = async (method, amount, publicKey) => {
  try {
    const tokenPrice = await fetchTokenPrices(method);
    const tokenAmount = amount / tokenPrice.price;
    const options = {
      method: "POST",
      url: `${PAY_API_URL}/builder/${
        method === "usdc" || method === "hnt" ? "spl" : "atomic"
      }`,
      data: {
        network: "mainnet",
        amount: 0.009,
        merchant: "JBkt9bcgFuAWKZRcMSza19Khxci7aXbnT1VbdFDj1un5",
        input_token: MAINNET_TOKENS[method.toUpperCase()].address,
        user: publicKey.toString(),
        reference: "HajSpXC9hrhLub3QLExsmc2G4ktH8dmFuLnMGpNmart3",
        fee: 0.0001,
        nft_discounts: undefined,
      },
    };

    const { data } = await axios.request(options);

    return Transaction.from(Buffer.from(data.transaction, "base64"));
  } catch (error) {
    console.log("TXN ERRRRRORRR****", error);
  }
};
