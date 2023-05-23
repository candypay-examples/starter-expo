import React from "react";
import { Image, Text, View } from "react-native";
import { MAINNET_TOKENS } from "./tokens";

const TokenCard = ({ checked, token }) => {
  return (
    <View
      style={{
        borderWidth: 3,
        marginHorizontal: 2,
        padding: 8,
        borderRadius: 6,
        backgroundColor: "#1a1a1a",
        borderColor: `${checked ? "#7F5ad5" : "#ebebeb"}`,
      }}
    >
      <Image
        style={{
          width: 20,
          height: 20,
        }}
        source={{
          uri: MAINNET_TOKENS[token].image,
        }}
      />
      <Text
        style={{
          marginTop: 8,
          color: "white",
        }}
      >
        {token}
      </Text>
    </View>
  );
};

export default TokenCard;
