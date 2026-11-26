/** The person denied access to the photo library: the screen says how to allow it again instead of doing nothing. */
export class ImagePermissionError extends Error {
  constructor() { super("Photo library permission denied"); this.name = "ImagePermissionError"; }
}
