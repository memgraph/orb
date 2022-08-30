export type ImageLoadedCallback = (error?: Error) => void;

export class ImageHandler {
  private static _instance: ImageHandler;
  private readonly _imageByUrl: Record<string, HTMLImageElement> = {};

  private constructor() {
    // Forbids usage of `new ImageHandler` - use `.getInstance()` instead
  }

  static getInstance(): ImageHandler {
    if (!ImageHandler._instance) {
      ImageHandler._instance = new ImageHandler();
    }

    return ImageHandler._instance;
  }

  getImage(url: string): HTMLImageElement | undefined {
    return this._imageByUrl[url];
  }

  loadImage(url: string, callback?: ImageLoadedCallback): HTMLImageElement {
    const existingImage = this.getImage(url);
    if (existingImage) {
      return existingImage;
    }

    const image = new Image();
    this._imageByUrl[url] = image;

    image.onload = () => {
      fixImageSize(image);
      callback?.();
    };
    image.onerror = () => {
      callback?.(new Error(`Image ${url} failed to load.`));
    };
    image.src = url;

    return image;
  }

  loadImages(urls: string[], callback?: ImageLoadedCallback): HTMLImageElement[] {
    const images: HTMLImageElement[] = [];
    const pendingImageUrls: Set<string> = new Set<string>(urls);

    const onImageLoaded = (url: string) => {
      pendingImageUrls.delete(url);
      if (pendingImageUrls.size === 0) {
        callback?.();
      }
    };

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const existingImage = this._imageByUrl[url];

      if (existingImage) {
        pendingImageUrls.delete(url);
        images.push(existingImage);
        continue;
      }

      const image = new Image();
      this._imageByUrl[url] = image;

      image.onload = () => {
        fixImageSize(image);
        onImageLoaded(url);
      };
      image.onerror = () => {
        onImageLoaded(url);
      };

      image.src = url;

      images.push(image);
    }

    return images;
  }
}

/**
 * Credits to https://github.com/almende/vis/blob/master/lib/network/Images.js#L98:L111
 * Fixes the width and height on IE11.
 *
 * @param {HTMLImageElement} image Image object
 * @return {HTMLImageElement} Fixed image object
 */
const fixImageSize = (image: HTMLImageElement): HTMLImageElement => {
  if (!image || image.width !== 0) {
    return image;
  }

  document.body.appendChild(image);
  image.width = image.offsetWidth;
  image.height = image.offsetHeight;
  document.body.removeChild(image);

  return image;
};
