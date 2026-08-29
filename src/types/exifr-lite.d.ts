declare module "exifr/dist/lite.esm.mjs" {
  type ExifrInput = Blob | ArrayBuffer | Uint8Array;

  export function gps(input: ExifrInput): Promise<{
    latitude: number;
    longitude: number;
  } | undefined>;

  type ExifrBlockOptions = {
    pick?: Array<string | number>;
    reviveValues?: boolean;
  };

  export function parse(input: ExifrInput, options?: {
    tiff?: boolean;
    ifd0?: boolean | ExifrBlockOptions;
    exif?: boolean | ExifrBlockOptions;
    gps?: boolean | ExifrBlockOptions;
    mergeOutput?: boolean;
    silentErrors?: boolean;
  }): Promise<Record<string, unknown> | undefined>;
}
