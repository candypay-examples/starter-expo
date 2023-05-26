import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import * as Random from "expo-random";
global.ExpoRandom = global.ExpoRandom || Random;
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { Image, Pressable, Text, View } from "react-native";
import axios from "axios";
import { ActivityIndicator } from "react-native-paper";
import topImage from "./assets/logo.png";
import middleImage from "./assets/image.png";
import bottomImage from "./assets/image_1.png";
import DropDownPicker from "react-native-dropdown-picker";
import { RootSiblingParent } from "react-native-root-siblings";
import { CANDYPAY_PRIVATE_KEY, CANDYPAY_PUBLIC_KEY } from "./secrets";
import { styles } from "./styles";

export default function App() {
  const [deepLink, setDeepLink] = useState("");
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
    }
  }, [deepLink]);

  return (
    <RootSiblingParent>
      {
        <View style={styles.container}>
          <Image style={styles.topLogo} source={topImage} />
          <Image style={styles.middleLogo} source={middleImage} />
          <Image style={styles.bottomLogo} source={bottomImage} />
          {
            <View style={styles.amountBoxStyle}>
              <Text style={styles.amountStyle}>${amount}</Text>
              <DropDownPicker
                style={styles.dropdownStyle}
                textStyle={styles.dropdownText}
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
          }
          <Pressable
            style={styles.button}
            onPress={async () => {
              setLoading(true);
              await generatePayLink(amount);
              setLoading(false);
            }}
          >
            <Text style={styles.buttonText}>Pay now</Text>
            {loading && <ActivityIndicator animating={true} color={"black"} />}
          </Pressable>
          <StatusBar style="auto" />
        </View>
      }
    </RootSiblingParent>
  );
}

const generatePayLink = async (amount) => {
  try {
    const body = {
      network: "devnet",
      success_url: "elements-sample://onConnect",
      cancel_url: "elements-sample://onConnect",
      items: [
        {
          name: "Subscription",
          price: amount,
          image: "https://imgur.com/tF3MaTI.png",
          quantity: 1,
        },
      ],
      config: {
        collect_shipping_address: false,
      },
    };

    const { data } = await axios.request({
      method: "POST",
      headers: {
        Authorization: `Bearer ${CANDYPAY_PRIVATE_KEY}`,
      },
      url: "https://checkout-api.candypay.fun/api/v1/session",
      data: body,
    });

    console.log(data.session_id);

    const payment = await axios.request({
      method: "GET",
      headers: {
        Authorization: `Bearer ${CANDYPAY_PUBLIC_KEY}`,
      },
      url: `https://checkout-api.candypay.fun/api/v1/session/payment_url?session_id=${data.session_id}`,
    });

    console.log(payment.data.payment_url);
    Linking.openURL(payment.data.payment_url);

    return payment.data.payment_url;
  } catch (error) {
    console.log("ERROR", error);
  }
};
