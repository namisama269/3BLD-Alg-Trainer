const BLACK = "black";
const WHITE = "white";
const YELLOW = "#F0FF00";
const RED = "#E8120A";
const ORANGE = "#FB8C00";
const GREEN = "#66FF33";
const BLUE = "#2055FF";

const CUBE_COLOR = BLACK;

class VisualCube {
    constructor(width, height, scale, thetaX, thetaY, thetaZ, cubeSize, gapSize) {
        this.width = width;
        this.height = height;
        this.scale = scale;
        this.thetaX = thetaX;
        this.thetaY = thetaY;
        this.thetaZ = thetaZ;

        this.cubeSize = cubeSize;
        this.gapSize = gapSize;

        this.cubeString = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
        // this.cubeString = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

        this.drawInside = false;

        this.shift = (Math.PI / 2) / 15;

        this.faceStickers = getFaceStickers(cubeSize, gapSize);
        this.points = [
            [-1, -1, 1],
            [1, -1, 1],
            [1,  1, 1],
            [-1, 1, 1],
            [-1, -1, -1],
            [1, -1, -1],
            [1, 1, -1],
            [-1, 1, -1]
        ];
        this.stickerColors = {
            "U": YELLOW,
            "D": WHITE,
            "R": GREEN,
            "L": BLUE,
            "F": RED,
            "B": ORANGE,
            "z": BLACK,
            "x": "#555555",
        }
        this.faceBase = {
            "U": [this.points[4], this.points[5], this.points[1], this.points[0]],
            "D": [this.points[7], this.points[6], this.points[2], this.points[3]],
            "R": [this.points[1], this.points[5], this.points[6], this.points[2]],
            "L": [this.points[4], this.points[0], this.points[3], this.points[7]],
            "F": [this.points[0], this.points[1], this.points[2], this.points[3]],
            "B": [this.points[4], this.points[5], this.points[6], this.points[7]]
        }

        // console.log(this.faceStickers);
    }


    
    
    drawStickers(ctx, colors, border, stickers) {
        for (let i = 0; i < stickers.length; ++i) {
            let sticker4Points = [];
            let s = stickers[i];
            s.forEach((pt) => {
                let rotated2d = [[pt[0]], [pt[1]], [pt[2]]];
    
                rotated2d = matrixProd(getRotationMatrix(this.thetaZ, "z"), rotated2d);
                rotated2d = matrixProd(getRotationMatrix(this.thetaY, "y"), rotated2d);
                rotated2d = matrixProd(getRotationMatrix(this.thetaX, "x"), rotated2d);
    
                let projected2d = matrixProd(PROJECTION, rotated2d);
    
                let x = Math.round(projected2d[0][0] * this.scale + this.width/2);
                let y = Math.round(projected2d[1][0] * this.scale + this.height/2);
    
                sticker4Points.push([x, y]);
            });
            
            ctx.fillStyle = this.stickerColors[colors[i]];
            ctx.beginPath();
            ctx.moveTo(sticker4Points[0].x, sticker4Points[0].y);
    
            for (let i = 0; i < sticker4Points.length; ++i) {
                ctx.lineTo(sticker4Points[i][0], sticker4Points[i][1]);
            }
    
            ctx.closePath();
            ctx.fill();
    
            ctx.strokeStyle = border;
            ctx.lineWidth = 2.5; 
            ctx.beginPath();
            ctx.moveTo(sticker4Points[0].x, sticker4Points[0].y);
    
            for (let i = 0; i < sticker4Points.length; ++i) {
                ctx.lineTo(sticker4Points[i][0], sticker4Points[i][1]);
            }
    
            ctx.closePath();
            ctx.stroke();
        }
    }

    drawCube(ctx) {
        // update colors
        if (useCustomColourScheme.checked){
            this.stickerColors["U"] = customColourU.value;
            this.stickerColors["L"] = customColourL.value;
            this.stickerColors["F"] = customColourF.value;
            this.stickerColors["R"] = customColourR.value;
            this.stickerColors["B"] = customColourB.value;
            this.stickerColors["D"] = customColourD.value;
        } else {
            this.stickerColors["U"] = defaults["customColourU"];
            this.stickerColors["L"] = defaults["customColourL"];
            this.stickerColors["F"] = defaults["customColourF"];
            this.stickerColors["R"] = defaults["customColourR"];
            this.stickerColors["B"] = defaults["customColourB"];
            this.stickerColors["D"] = defaults["customColourD"];
        }

        ctx.imageSmoothingEnabled = true;

        // clear canvas first
        ctx.fillStyle = "white";
        ctx.clearRect(0, 0, this.width, this.height);
    
        // compute distance to camera to get face rendering order
        let newPoints = [];
        this.points.forEach((pt) => {
            let rotated2d = [[pt[0]], [pt[1]], [pt[2]]];
            rotated2d = matrixProd(getRotationMatrix(this.thetaZ, "z"), rotated2d);
            rotated2d = matrixProd(getRotationMatrix(this.thetaY, "y"), rotated2d);
            rotated2d = matrixProd(getRotationMatrix(this.thetaX, "x"), rotated2d);
    
            let np = [rotated2d[0], rotated2d[1], rotated2d[2]]
            
            newPoints.push(np);
        });
    
    
        let newFaceBase = {
            "U": [newPoints[4], newPoints[5], newPoints[1], newPoints[0]],
            "D": [newPoints[7], newPoints[6], newPoints[2], newPoints[3]],
            "R": [newPoints[1], newPoints[5], newPoints[6], newPoints[2]],
            "L": [newPoints[4], newPoints[0], newPoints[3], newPoints[7]],
            "F": [newPoints[0], newPoints[1], newPoints[2], newPoints[3]],
            "B": [newPoints[4], newPoints[5], newPoints[6], newPoints[7]]
        };
    
        let dists = [];
        for (const [k, v] of Object.entries(newFaceBase)) {
            let dtc = distToCam(v, this.width);
            dists.push([dtc, k]);
        }
        dists.sort();
        dists.reverse();
        
        // console.log(this.cubeString);
        let cubeData = convertCubeString(this.cubeString);
        // console.log(cubeData);
    
        for (let i = 0; i < dists.length; ++i) {
            let face = dists[i][1];
            // console.log(this.faceStickers);
            if (this.drawInside) {
                this.drawStickers(ctx, "z", BLACK, [this.faceBase[face]]);
            }
            this.drawStickers(ctx, cubeData[face], BLACK, this.faceStickers[face]);
        }
    }

}