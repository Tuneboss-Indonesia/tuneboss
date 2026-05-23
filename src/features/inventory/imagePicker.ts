import { Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

export type PickedImage = File | { name: string; type: string; uri: string };

export function pickedImageName(image: PickedImage): string {
  return "name" in image ? image.name : "gambar-produk.jpg";
}

export function pickedImagePreviewUri(image: PickedImage): string {
  if ("uri" in image) return image.uri;
  return URL.createObjectURL(image);
}

export function appendPickedImage(form: FormData, field: string, image: PickedImage): void {
  if ("uri" in image) {
    form.append(field, image as unknown as Blob);
    return;
  }

  form.append(field, image);
}

export async function pickImage(): Promise<PickedImage | null> {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Izin dibutuhkan", "Izinkan akses galeri untuk memilih gambar produk.");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.9,
  });

  if (result.canceled || !result.assets.length) return null;

  const asset = result.assets[0];
  const name = asset.fileName || `produk-${Date.now()}.jpg`;
  const type = asset.mimeType || "image/jpeg";

  return { name, type, uri: asset.uri };
}
