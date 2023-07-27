import { modelScaleProps } from "./Interface";

const MOBILE_BREAKPOINT = 768;
const MOBILE_CUTOUT_LIMIT = 30;

interface Point {
  x: number;
  y: number;
}

const createCutouts = async (
  image: HTMLImageElement,
  svg: string[],
  allsvg: { svg: string[]; point_coord: number[] }[],
  stickers: HTMLCanvasElement[],
  setStickers: (e: HTMLCanvasElement[]) => void,
  segmentTypes: "Box" | "Click" | "All",
  setActiveSticker: (e: number) => void,
  setIsLoading: (e: boolean) => void,
  scale: modelScaleProps,
  handleResetInteraction: () => void
) => {
  const doCreateCutouts = () => {
    setActiveSticker(0);
    if (segmentTypes === "All" && allsvg) {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const stickerSvgs = isMobile
        ? allsvg?.slice(0, MOBILE_CUTOUT_LIMIT)
        : allsvg;
      const newStickers = stickerSvgs.map(({ svg }, i) => {
        try {
          return cropImageByPath(image!, svg?.join(" ")!);
        } catch (error) {
          console.log(error);
        }
      });
      const filteredStickers: HTMLCanvasElement[] = newStickers.filter(
        (
          sticker: HTMLCanvasElement | undefined
        ): sticker is HTMLCanvasElement => sticker !== undefined
      );
      setStickers([...(filteredStickers || []), ...(stickers || [])]);
    } else {
      const newSticker = cropImageByPath(image!, svg?.join(" ")!);
      if (newSticker) {
        setStickers([newSticker, ...(stickers || [])]);
      }
    }
    handleResetInteraction();
    setIsLoading(false);
  };

  const cropImageByPath = (
    image: HTMLImageElement,
    pathData: string
  ): HTMLCanvasElement | undefined => {
    const { width, height, uploadScale } = scale;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const pathWidth = width * uploadScale;
    const pathHeight = height * uploadScale;
    const scaleX = width / pathWidth;
    const scaleY = height / pathHeight;
    const points = parsePathData(pathData, scaleX, scaleY);
    const {
      x,
      y,
      width: cropWidth,
      height: cropHeight,
    } = getBoundingBox(points);
    const path = new Path2D();

    path.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      path.lineTo(points[i].x, points[i].y);
    }
    canvas.width = width;
    canvas.height = height;
    ctx?.clip(path);
    ctx?.drawImage(image, 0, 0, width, height);
    return cropCanvasToBoundingBox(canvas, x, y, cropWidth, cropHeight);
  };

  const parsePathData = (
    pathData: string,
    scaleX: number,
    scaleY: number
  ): Point[] => {
    const commands = pathData.split(/(?=[A-Za-z])/);
    const points: Point[] = [];
    let currentPoint: Point = { x: 0, y: 0 };

    commands.forEach((command) => {
      const type = command.charAt(0);
      const args = command
        .substring(1)
        .trim()
        .split(/[ ,]+/)
        .map((arg) => parseFloat(arg));

      // Based on svgCoordToInt() in mask_utils.tsx, we only use the "M" and "L" commands
      switch (type) {
        case "M":
          currentPoint = { x: args[0] * scaleX, y: args[1] * scaleY };
          points.push(currentPoint);
          break;
        case "L":
          for (let i = 0; i < args.length; i += 2) {
            const x = args[i] * scaleX;
            const y = args[i + 1] * scaleY;
            currentPoint = { x, y };
            points.push(currentPoint);
          }
          break;
        default:
          break;
      }
    });

    return points;
  };

  const getBoundingBox = (
    points: Point[]
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
  } => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    points.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  };

  const cropCanvasToBoundingBox = (
    canvas: HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number
  ): HTMLCanvasElement | undefined => {
    const croppedCanvas = document.createElement("canvas");
    const croppedCtx = croppedCanvas.getContext("2d");

    // Set the dimensions of the cropped canvas
    croppedCanvas.width = width;
    croppedCanvas.height = height;

    // Draw the portion of the original canvas that falls within the bounding box
    croppedCtx?.drawImage(canvas, x, y, width, height, 0, 0, width, height);

    return croppedCanvas;
  };

  doCreateCutouts();
};

export { createCutouts };
