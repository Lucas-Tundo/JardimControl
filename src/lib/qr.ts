import QRCode from "qrcode";
import { getOrigin } from "./origin";

export async function locationQrUrl(token: string): Promise<string> {
  return `${await getOrigin()}/l/${token}`;
}

export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#0b2e1a", light: "#ffffff" } });
}
