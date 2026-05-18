import * as signalR from "@microsoft/signalr";
import { BASE_URL } from "../api/client";

export interface RainAlertPayload {
  cameraId: string;
  cameraName?: string;
  rainLevel?: string;
  trafficLevel?: string;
  isRaining?: boolean;
  confidence?: number;
  imageUrl?: string | null;
  timestamp?: string;
}

interface RainHubOptions {
  token?: string | null;
  onRainAlert: (payload: RainAlertPayload) => void;
}

export const startRainHub = async ({ token, onRainAlert }: RainHubOptions) => {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${BASE_URL}/rainHub`, {
      accessTokenFactory: () => token || "",
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  connection.on("ReceiveRainAlert", onRainAlert);
  await connection.start();
  await connection.invoke("JoinDashboard");

  return async () => {
    connection.off("ReceiveRainAlert", onRainAlert);
    await connection.stop();
  };
};
