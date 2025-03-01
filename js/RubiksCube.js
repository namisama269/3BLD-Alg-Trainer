
const SOLVED_STATE = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

var currentRotation = "";
var currentAlgorithm = ""; //After an alg gets tested for the first time, it becomes the currentAlgorithm.
var currentScramble = "";
var algArr; //This is the array of alternatives to currentAlgorithm

var cube = new RubiksCube();
const canvas = document.getElementById("cube");
const ctx = canvas.getContext("2d");
const VIRTUAL_CUBE_SIZE = 400;
var vc = new VisualCube(1200, 1200, VIRTUAL_CUBE_SIZE, -0.523598, -0.209439, 0, 3, 0.08);
var stickerSize = canvas.width/5;
var currentAlgIndex = 0;
var algorithmHistory = [];
var shouldRecalculateStatistics = true;

Cube.initSolver();

const holdingOrientation = document.getElementById('holdingOrientation');
let currentPreorientation = "";

document.addEventListener("DOMContentLoaded", function() {
    const savedValue = localStorage.getItem('holdingOrientation');
    if (savedValue !== null) {
        holdingOrientation.value = savedValue;
    }
    holdingOrientation.addEventListener('input', function() {
        localStorage.setItem('holdingOrientation', holdingOrientation.value);
    });

    cube.resetCube();
    updateVirtualCube();
});

const initialMask = document.getElementById('initialMask');
document.addEventListener("DOMContentLoaded", function() {
    const savedValue = localStorage.getItem('initialMask');
    if (savedValue !== null) {
        initialMask.value = savedValue;
    }
    initialMask.addEventListener('input', function() {
        localStorage.setItem('initialMask', initialMask.value);
    });
});

const finalMask = document.getElementById('finalMask');
document.addEventListener("DOMContentLoaded", function() {
    const savedValue = localStorage.getItem('finalMask');
    if (savedValue !== null) {
        finalMask.value = savedValue;
    }
    finalMask.addEventListener('input', function() {
        localStorage.setItem('finalMask', finalMask.value);
    });
});

// find a non-center sticker that does not move for the entire alg
function findPivot(alg) {
    let cube = new RubiksCube();
    let moves = alg.split(" ");
    let states = [];
    
    for (let move of moves) {
        cube.doAlgorithm(move);
        states.push(cube.getMaskValues());
    }
    
    console.log(states.map(state => state.join(",")).join("\n"));
    
    for (let i = 0; i < 54; ++i) {
        // skip centers
        if (i % 9 == 4) continue;

        let stateSet = new Set();
        for (let state of states) {
            stateSet.add(state[i]);
        }

        if (stateSet.size == 1) {
            return i;
        }
    }

    return -1;
}

// move the pivot so that it is back in its starting place
// brute force all combination of 2 rotations
function findRotationToFixPivot(pivotIndex) {
    const rotations = ["", "x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"];

    for (let i = 0; i < rotations.length; ++i) {
        for (let j = 0; j < rotations.length; ++j) {
            let rotation = rotations[i] + ' ' + rotations[j];
            rotation = rotation.trim();

            // console.log(rotation);

            cube.doAlgorithm(rotation);
            if (cube.cubestate[pivotIndex][1] == pivotIndex) {
                cube.doAlgorithm(alg.cube.invert(rotation));
                return rotation;
            }

            cube.doAlgorithm(alg.cube.invert(rotation));
        }
    }

    return "rotation not found";
}

function simplifyRotation(move, rotation) {
    const rotationMap = {
        "x": { "B": "U", "F": "D", "U": "F", "D": "B", "L": "L", "R": "R" },
        "x'": { "F": "U", "B": "D", "U": "B", "D": "F", "L": "L", "R": "R" },
        "y": { "L": "F", "R": "B", "F": "R", "B": "L", "U": "U", "D": "D" },
        "y'": { "F": "L", "B": "R", "L": "B", "R": "F", "U": "U", "D": "D" },
        "z": { "U": "L", "D": "R", "L": "D", "R": "U", "F": "F", "B": "B" },
        "z'": { "U": "R", "D": "L", "L": "U", "R": "D", "F": "F", "B": "B" }
    };

    move = move.trim();
    rotation = rotation.trim();

    if (rotation in rotationMap && move[0] in rotationMap[rotation]) {
        return rotationMap[rotation][move[0]] + move.slice(1);
    }

    return move; // Return unchanged if no transformation is needed
}

function applyMoves(moves) {   
    let ori = cube.wcaOrient();
    doAlg(alg.cube.invert(ori), false);
    let startingRotation = ori;
    console.log("starting rotation: ", startingRotation);


    let fixPivotRotation = "";

    if (algorithmHistory.length > 0) {
        var lastTest = algorithmHistory[algorithmHistory.length-1];
        if (lastTest==undefined){
            return;
        }


        tmp = startingRotation + " " + moves + " " + alg.cube.invert(startingRotation);
        cube.doAlgorithm(tmp);

        let pivotIndex = findPivot(commToMoves(lastTest.solutions[0]));

        if (pivotIndex != -1) {
            fixPivotRotation = findRotationToFixPivot(pivotIndex);
            if (fixPivotRotation.length > 0) {
                // doAlg(fixPivotRotation, true);
                // doAlg(alg.cube.invert(fixPivotRotation), true);

                console.log(lastTest.solutions[0], "pivot at", pivotIndex, "fix with rotation", fixPivotRotation);

                
            }
        }

        cube.doAlgorithm(alg.cube.invert(tmp));

        console.log("doing alg: ", lastTest.solutions[0]);
    }

    let simplifiedMove = moves;
    for (rotation of startingRotation.split(" ")) {
        simplifiedMove = simplifyRotation(simplifiedMove, rotation);
    }

    cube.doAlgorithm(
        startingRotation 
        + " " + 
        alg.cube.invert(holdingOrientation.value)
        + " " +  
        moves 
        + " " + 
        holdingOrientation.value
        + " " + 
        alg.cube.invert(startingRotation) 
        + " " +  
        fixPivotRotation
        // alg.cube.invert(fixPivotRotation)
        
    );

    if (fixPivotRotation.length > 0)
        console.log("need to do fpr", fixPivotRotation);


    doAlg("U U'", true);

    updateVirtualCube();
}

// connect smart cube
//////////////////////////////////////////////////////////////

let conn = null;

var connectSmartCube = document.getElementById("connectSmartCube");
connectSmartCube.addEventListener('click', async () => {
    try {
        if (conn) {
            await conn.disconnect();
            connectSmartCube.textContent = 'Connect Smart Cube';
            alert(`Smart cube ${conn.deviceName} disconnected`);
            conn = null;
        } else {
            conn = await connect(applyMoves);
            if (!conn) {
                alert(`Smart cube is not supported`);
            } else {
                await conn.initAsync();
                connectSmartCube.textContent = 'Disconnect Smart Cube';
                alert(`Smart cube ${conn.deviceName} connected`);
            }
        }
    } catch (e) {
        connectSmartCube.textContent = 'Connect Smart Cube';
    }
}); 


// buttons

function adjustButtonWidths() {
    minButtonWidth = 100;
    var buttonGrids = document.querySelectorAll('.button-grid');
    buttonGrids.forEach(function(grid) {
        var buttons = grid.querySelectorAll('.cube-select-button');
        var containerWidth = window.innerWidth;
        var packSize = buttons.length;
        
        var buttonWidth = Math.min(100, ((containerWidth - 2 * 20 - (packSize + 1)) / packSize)); 
        buttonWidth = Math.max(30, buttonWidth);
        minButtonWidth = Math.min(buttonWidth, minButtonWidth);

        buttons.forEach(function(button) {
            button.style.width = minButtonWidth + 'px';
            button.style.height = minButtonWidth * 0.85 + 'px'; // Set height equal to width
        });
    });
}

window.addEventListener('resize', adjustButtonWidths); 

function handleButtonClick(event) {
    console.log("Button clicked:", event.target.textContent);
    doAlg(event.target.textContent);
    updateVirtualCube();
}

var numCubes = 36;
var packSize = 9;
var numFullPacks = Math.floor(numCubes / packSize);
var lastPackSize = numCubes % packSize;

var container = document.getElementById("cubeSelectButtons");

var keypadLayout = [
    ["b", "S'", "E", "f'", "x", "f", "E'", "S", "b"],
    ["z'", "l'", "L'", "U'", "M'", "U", "R", "r", "z"],
    ["y'", "l", "L", "F'", "M", "F", "R'", "r'", "y"],
    ["d", "B", "u'", "D", "x'", "D'", "u", "B'", "d'"]
]

// for (let i = 0; i <= numFullPacks; ++i) {
//     var cubeContainer = document.createElement('div');
//     cubeContainer.className = 'cube-container';

//     // Create a grid container for buttons
//     var buttonGrid = document.createElement('div');
//     buttonGrid.className = 'button-grid';

//     // Create packSize number of buttons inside the button grid
//     for (var j = 1; j <= (i === numFullPacks ? lastPackSize : packSize); ++j) {
//         var button = document.createElement('button');
//         button.textContent = keypadLayout[i][j-1];
//         button.className = 'cube-select-button';
//         button.id = 'container-' + i + '-button-' + j;
//         button.addEventListener("click", handleButtonClick);

//         buttonGrid.appendChild(button);
//     }

//     cubeContainer.appendChild(buttonGrid);
//     container.appendChild(cubeContainer);
// }

// adjustButtonWidths();



//////////////////////////////////////////////////////////////

document.getElementById("loader").style.display = "none";
var myVar = setTimeout(showPage, 1);
function showPage(){
    document.getElementById("page").style.display = "block";
}

var defaults = {"useVirtual":true,
                "hideTimer":true,
                "includeRecognitionTime":false,
                "showScramble":true,
                "realScrambles":true,
                "randAUF":false,
                "prescramble":false,
                "goInOrder":false,
                "goToNextCase":false,
                "mirrorAllAlgs":false,
                "mirrorAllAlgsAcrossS":false,
                "colourneutrality1":"",
                "colourneutrality2":"",
                "colourneutrality3":"",
                // "colourneutrality2":"x2",
                // "colourneutrality3":"y",
                // "userDefined":false,
                "userDefinedAlgs":"",
                "fullCN":false,
                // "algsetpicker":document.getElementById("algsetpicker").options[0].value,
                "visualCubeView":"plan",
                "randomizeSMirror":false,
                "randomizeMMirror":false,
               };

for (var setting in defaults){ 
// If no previous setting exists, use default and update localStorage. Otherwise, set to previous setting
    if (typeof(defaults[setting]) === "boolean"){
        var previousSetting = localStorage.getItem(setting);
        if (previousSetting == null){
            document.getElementById(setting).checked = defaults[setting];
            localStorage.setItem(setting, defaults[setting]);
        }
        else {
            document.getElementById(setting).checked = previousSetting == "true"? true : false;
        }
    }
    else {
        var previousSetting = localStorage.getItem(setting);
        if (previousSetting == null){
            var element = document.getElementById(setting)
            if (element != null){
                element.value = defaults[setting];
            }
            localStorage.setItem(setting, defaults[setting]);
        }
        else {
            var element = document.getElementById(setting)
            if (element != null){
                element.value = previousSetting;
            }
        }
    }
}

setTimerDisplay(!document.getElementById("hideTimer").checked);
// if (document.getElementById("userDefined").checked){
document.getElementById("userDefinedAlgs").style.display = "block";
// }

setVirtualCube(document.getElementById("useVirtual").checked);
updateVirtualCube();

var useVirtual = document.getElementById("useVirtual");
useVirtual.addEventListener("click", function(){
    setVirtualCube(this.checked);
    localStorage.setItem("useVirtual", this.checked);
    stopTimer(false);
    document.getElementById("timer").innerHTML = "0.00";
});

var hideTimer = document.getElementById("hideTimer");
hideTimer.addEventListener("click", function(){
    setTimerDisplay(!this.checked);
    localStorage.setItem("hideTimer", this.checked);
    stopTimer(false);
    document.getElementById("timer").innerHTML = "0.00";
});

var includeRecognitionTime = document.getElementById("includeRecognitionTime");
var isIncludeRecognitionTime = localStorage.getItem("includeRecognitionTime") === "true";
includeRecognitionTime.addEventListener("click", function(){
    localStorage.setItem("includeRecognitionTime", this.checked);
    isIncludeRecognitionTime = includeRecognitionTime.checked;
});

var visualCube = document.getElementById("visualcube");
visualCube.addEventListener("click", function(){
    var currentView = localStorage.getItem("visualCubeView")
    var newView = currentView == ""? "plan": "";
    localStorage.setItem("visualCubeView", newView);
    var algTest = algorithmHistory[historyIndex];
});


var showScramble = document.getElementById("showScramble");
showScramble.addEventListener("click", function(){
    localStorage.setItem("showScramble", this.checked);
});

var realScrambles = document.getElementById("realScrambles");
realScrambles.addEventListener("click", function(){
    localStorage.setItem("realScrambles", this.checked);
});

var randAUF = document.getElementById("randAUF");
randAUF.addEventListener("click", function(){
    localStorage.setItem("randAUF", this.checked);
});

var prescramble = document.getElementById("prescramble");
prescramble.addEventListener("click", function(){
    localStorage.setItem("prescramble", this.checked);
});

var randomizeSMirror = document.getElementById("randomizeSMirror");
randomizeSMirror.addEventListener("click", function(){
    localStorage.setItem("randomizeSMirror", this.checked);
});

var randomizeMMirror = document.getElementById("randomizeMMirror");
randomizeMMirror.addEventListener("click", function(){
    localStorage.setItem("randomizeMMirror", this.checked);
});

var goInOrder = document.getElementById("goInOrder");
goInOrder.addEventListener("click", function(){
    localStorage.setItem("goInOrder", this.checked);
    currentAlgIndex=0;
});

var goToNextCase = document.getElementById("goToNextCase");
goToNextCase.addEventListener("click", function(){
    if (isUsingVirtualCube()){
        alert("Note: This option has no effect when using the virtual cube.")
    }
    localStorage.setItem("goToNextCase", this.checked);
});

var mirrorAllAlgs = document.getElementById("mirrorAllAlgs");
mirrorAllAlgs.addEventListener("click", function(){
    localStorage.setItem("mirrorAllAlgs", this.checked);
});

var mirrorAllAlgsAcrossS = document.getElementById("mirrorAllAlgsAcrossS");
mirrorAllAlgsAcrossS.addEventListener("click", function(){
    localStorage.setItem("mirrorAllAlgsAcrossS", this.checked);
});

// var userDefined = document.getElementById("userDefined");
// userDefined.addEventListener("click", function(){
//     document.getElementById("userDefinedAlgs").style.display = this.checked? "block":"none";
//     localStorage.setItem("userDefined", this.checked);
// });

var fullCN = document.getElementById("fullCN");
fullCN.addEventListener("click", function(){
    localStorage.setItem("fullCN", this.checked);
});

// var algsetpicker = document.getElementById("algsetpicker");
// algsetpicker.addEventListener("change", function(){
//     createCheckboxes();
// 	shouldRecalculateStatistics = true;
//     localStorage.setItem("algsetpicker", this.value);
// });

var clearTimes = document.getElementById("clearTimes");
clearTimes.addEventListener("click", function(){

    if (confirm("Clear all times?")){
        timeArray = [];
        updateTimeList();
        updateStats();
    }

});

var deleteLast = document.getElementById("deleteLast");
deleteLast.addEventListener("click", function(){
    timeArray.pop();
    algorithmHistory.pop();
    updateTimeList();
    updateStats();
});

// var addSelected = document.getElementById("addSelected");
// addSelected.addEventListener("click", function(){

//     var algList = createAlgList(true);
//     for (let i = 0; i < algList.length; i++){
//         algList[i] = algList[i].split("/")[0]
//     }
//     document.getElementById("userDefinedAlgs").value += "\n" + algList.join("\n");
// });

try{ // only for mobile
    const leftPopUpButton = document.getElementById("left_popup_button");
    const rightPopUpButton = document.getElementById("right_popup_button");
    leftPopUpButton.addEventListener("click", function(){

        const leftPopUp = document.getElementById("left_popup");
        const rightPopUp = document.getElementById("right_popup");
        if (leftPopUp.style.display == "block"){
            leftPopUp.style.display = "none";
        }
        else {
            leftPopUp.style.display = "block";
            rightPopUp.style.display = "none";
        }
    });

    rightPopUpButton.addEventListener("click", function(){

        const leftPopUp = document.getElementById("left_popup");
        const rightPopUp = document.getElementById("right_popup");
        if (rightPopUp.style.display == "block"){
            rightPopUp.style.display = "none";
        }
        else {
            rightPopUp.style.display = "block";
            leftPopUp.style.display = "none";
        }
    });
} catch (error) {

}

function getRotationMap(moves) {
    let rotationMap = {};

    let rotationCube = new RubiksCube();
    console.log('moves: ', moves);
    rotationCube.doAlgorithm(moves);
    // let rotationCubeString = rotationCube.toString();
    // console.log(rotationCubeString);

    let faces = "URFDLB";
    for (let i = 0; i < 6; ++i) {
        rotationMap[faces[i]] = faces[rotationCube.cubestate[9*i+5][0]-1];
    }

    return rotationMap;
}

function updateVirtualCube(initialRotations = holdingOrientation.value + ' ' + currentPreorientation) {
    console.log("preorientation: ", currentPreorientation);
    vc.cubeString = cube.toString();
    let initialMaskedCubeString = cube.toInitialMaskedString(initialMask.value);
    // console.log(initialMaskedCubeString);
    // console.log(vc.cubeString);

    let rotationMap = getRotationMap(initialRotations);
    // console.log(rotationMap);

    for (let k = 0; k < 54; ++k) {
        if (vc[k] != 'x') {
            // console.log(vc.cubeString[k]);
            // console.log(rotationMap[vc.cubeString[k]]);
            vc.cubeString = setCharAt(vc.cubeString, k, rotationMap[vc.cubeString[k]]);
        }

        if (initialMaskedCubeString[k] == 'x' || finalMask.value[k] == 'x') {
            vc.cubeString = setCharAt(vc.cubeString, k, 'x');
        }
    }
    
    vc.drawCube(ctx);
}


function doAlg(algorithm, updateTimer=false){
    cube.doAlgorithm(algorithm);
    // updateVirtualCube();

    // console.log(isIncludeRecognitionTime);

    if (isUsingVirtualCube() && !isIncludeRecognitionTime && updateTimer) {
        if (!timerIsRunning) {
            startTimer();
        }
    }

    if (timerIsRunning && cube.isSolved(initialMask.value) && isUsingVirtualCube()){
        if (updateTimer) {
            stopTimer();
            nextScramble();
        }
        else {
            stopTimer();
        }
    }
}


function getRandAuf(letter){
    var rand = Math.floor(Math.random()*4);//pick 0,1,2 or 3
    var aufs = [letter + " ", letter +"' ",letter + "2 ", ""];
    return aufs[rand];
}

// Returns a random sequence of quarter turns of the specified length. Quarter turns are used to break OLL. Two consecutive moves may not be on the same axis.
function getPremoves(length) {
    var previous = "U"; // prevents first move from being U or D
    var moveset = ['U', 'R', 'F', 'D', 'L', 'B'];
    var amts = [" ","' "];
    var randmove = "";
    var sequence = "";
    for (let i=0; i<length; i++) {
        do {
            randmove = moveset[Math.floor(Math.random()*moveset.length)];
        } while (previous != "" && (randmove === previous || Math.abs(moveset.indexOf(randmove) - moveset.indexOf(previous)) === 3))
        previous = randmove;
        sequence += randmove;
        sequence += amts[Math.floor(Math.random()*amts.length)];
    }
    return sequence;
}

/*

This will return an algorithm that has the same effect as algorithm, but with different moves.
This requires https://github.com/ldez/cubejs to work. The Cube.initSolver(); part takes a long time, so I removed it for the time being. 

Generate the 3 premoves
Start with a solved cube
Do (the inverse of the premoves + the scramble algorithm) on the cube
Find the solution to the cubestate
Return the premoves + the inverse of the solution, canceling any redundant moves
If the solution it finds is under 16 moves, it scraps that solution, then starts from scratch,
but with 4 random premoves. Then if that solution is still under 16 moves, 
then it starts from scratch again but with 5 random premoves. And so on...

B U F' B2 F2 D' L2 F2 U2 B2 R2 U2 F2 D' F' U' B2 U B U2
L' U' R L2 R2 D F2 D' R2 U B2 R2 F2 D' L2 R' D' L' B2 R F2 R U2


*/
function obfuscate(algorithm, numPremoves=3, minLength=16){

    //Cube.initSolver();
    var premoves = getPremoves(numPremoves);
    var rc = new RubiksCube();
    rc.doAlgorithm(alg.cube.invert(premoves) + algorithm);
    var orient = alg.cube.invert(rc.wcaOrient());
    var solution = alg.cube.simplify(premoves + (alg.cube.invert(rc.solution())) + orient).replace(/2'/g, "2");
    return solution.split(" ").length >= minLength ? solution : obfuscate(algorithm, numPremoves+1, minLength);

}

function addAUFs(algArr){

    var rand1 = getRandAuf("U");
    var rand2 = getRandAuf("U");
    //algorithm = getRandAuf() + algorithm + " " +  getRandAuf()
    var i = 0;
    for (;i<algArr.length;i++){
        algArr[i] = alg.cube.simplify(rand1 + algArr[i] + " " + rand2); 
    }
    return algArr;
}

function generateAlgScramble(raw_alg,obfuscateAlg,shouldPrescramble){
    
    // if (set == "F3L" && !document.getElementById("userDefined").checked){
    //     return Cube.random().solve();
    // }
    if (!obfuscateAlg){
        return alg.cube.invert(raw_alg);
    } else if (!shouldPrescramble){//if realscrambles not checked but should not prescramble, just obfuscate the inverse
        return obfuscate(alg.cube.invert(raw_alg));
    }

}



function generatePreScramble(raw_alg, generator, times, obfuscateAlg, premoves=""){

    var genArray = generator.split(",");

    var scramble = premoves;
    var i = 0;

    for (; i<times; i++){
        var rand = Math.floor(Math.random()*genArray.length);
        scramble += genArray[rand];
    }
    scramble += alg.cube.invert(raw_alg);

    if (obfuscateAlg){
        return obfuscate(scramble);
    }
    else {
        return scramble;
    }

}

function generateOrientation(){
    var cn1 = document.getElementById("colourneutrality1").value;
    if (document.getElementById("fullCN").checked){
        var firstRotation = ["", "x", "x'", "x2", "y", "y'"]
        // each one of these first rotations puts a different color face on F
        var secondRotation = ["", "z", "z'", "z2"]
        // each second rotation puts a different edge on UF
        // each unique combination of a first and second rotation 
        // must result in a unique orientation because a different color is on F
        // and a different edge is on UF. Hence all 6x4=24 rotations are reached.

        var rand1 = Math.floor(Math.random()*6);
        var rand2 = Math.floor(Math.random()*4);
        var randomPart = firstRotation[rand1] + secondRotation[rand2];
        if (randomPart == "x2z2"){
            randomPart = "y2";
        }
        var fullOrientation = cn1 + randomPart; // Preorientation to perform starting from white top green front
        return [fullOrientation, randomPart];
    }
    var cn2 = document.getElementById("colourneutrality2").value;
    var cn3 = document.getElementById("colourneutrality3").value;

    //todo: warn if user enters invalid strings

    localStorage.setItem("colourneutrality1", cn1);
    localStorage.setItem("colourneutrality2", cn2);
    localStorage.setItem("colourneutrality3", cn3);

    var rand1 = Math.floor(Math.random()*4);
    var rand2 = Math.floor(Math.random()*4);

    //console.log(cn1 + cn2.repeat(rand1) + cn3.repeat(rand2));
    var randomPart = cn2.repeat(rand1) + cn3.repeat(rand2); // Random part of the orientation
    var fullOrientation = cn1 + randomPart; // Preorientation to perform starting from white top green front
    return [fullOrientation, randomPart];
}

class AlgTest {
    constructor(rawAlgs, scramble, solutions, preorientation, solveTime, time, visualCubeView, orientRandPart) {
        this.rawAlgs = rawAlgs;
        this.scramble = scramble;
        this.solutions = solutions;
        this.preorientation = alg.cube.simplify(preorientation);
        currentPreorientation = this.preorientation;
        this.solveTime = solveTime;
        this.time = time;
        // this.set = set;
        this.visualCubeView = visualCubeView;
        this.orientRandPart = orientRandPart;
    }
}

// Adds extra rotations to the end of an alg to reorient
function correctRotation(alg) {
    var rc = new RubiksCube();
    rc.doAlgorithm(alg);
    var ori = rc.wcaOrient();
	
    return alg + " " + ori;
}

function generateAlgTest(){

    var obfuscateAlg = document.getElementById("realScrambles").checked;
    var shouldPrescramble = document.getElementById("prescramble").checked;
    var randAUF = document.getElementById("randAUF").checked;

    var algList = createAlgList();
    updateAlgsetStatistics(algList);
    // if (shouldRecalculateStatistics){
    //     updateAlgsetStatistics(algList);
    //     shouldRecalculateStatistics = false;
    // }
    var rawAlgStr = randomFromList(algList);
    var rawAlgs = rawAlgStr.split("!");
    rawAlgs = fixAlgorithms(rawAlgs);

    //Do non-randomized mirroring first. This allows a user to practise left slots, back slots, front slots, rights slots
    // etc for F2L like algsets
    if (mirrorAllAlgs.checked && !randomizeMMirror.checked) {
        rawAlgs = mirrorAlgsAcrossAxis(rawAlgs, axis="M");
    }
    if (mirrorAllAlgsAcrossS.checked && !randomizeSMirror.checked) {
        rawAlgs = mirrorAlgsAcrossAxis(rawAlgs, axis="S");
    }
    if (mirrorAllAlgs.checked && randomizeMMirror.checked) {
        if (Math.random() > 0.5){
            rawAlgs = mirrorAlgsAcrossAxis(rawAlgs, axis="M");
        }
    }
    if (mirrorAllAlgsAcrossS.checked && randomizeSMirror.checked) {
        if (Math.random() > 0.5){
            rawAlgs = mirrorAlgsAcrossAxis(rawAlgs, axis="S");
        }
    }


    var solutions;
    if (randAUF){
        solutions = addAUFs(rawAlgs);
    } else {
        solutions = rawAlgs;
    }

    // pass the solutions[0] through comm to moves converter
    // console.log(solutions[0]);
    var scramble = generateAlgScramble(correctRotation(commToMoves(solutions[0])),obfuscateAlg,shouldPrescramble);

    var [preorientation, orientRandPart] = generateOrientation();
    orientRandPart = alg.cube.simplify(orientRandPart);

    var solveTime = null;
    var time = Date.now();
    var visualCubeView = "plan";

    var algTest = new AlgTest(rawAlgs, scramble, solutions, preorientation, solveTime, time, visualCubeView, orientRandPart);
    return algTest;
}
function testAlg(algTest, addToHistory=true){

    var scramble = document.getElementById("scramble");

    if (document.getElementById("showScramble").checked){
        scramble.innerHTML = "<span style=\"color: #90f182\">" + algTest.orientRandPart + "</span>" + " " + algTest.scramble;
    } else{
        scramble.innerHTML = "&nbsp;";
    }

    document.getElementById("algdisp").innerHTML = "";

    cube.resetCube();
    doAlg(algTest.scramble, false);
    updateVirtualCube();

    if (addToHistory){
        algorithmHistory.push(algTest);
    }
    console.log(algTest);

}

function updateAlgsetStatistics(algList){
    var stats = {"STM": averageMovecount(algList, "btm", false).toFixed(3),
                "SQTM": averageMovecount(algList, "bqtm", false).toFixed(3),
                "STM (including AUF)": averageMovecount(algList, "btm", true).toFixed(3),
                "SQTM (including AUF)": averageMovecount(algList, "bqtm", true).toFixed(3),
                "Number of algs": algList.length};

    var table = document.getElementById("algsetStatistics");
    table.innerHTML = "";
    var th = document.createElement("th");
    th.appendChild(document.createTextNode("Algset Statistics"));
    table.appendChild(th);
    for (var key in stats){
        var tr = document.createElement("tr");
        var description = document.createElement("td");
        var value = document.createElement("td");
        description.appendChild(document.createTextNode(key));
        value.appendChild(document.createTextNode(stats[key]));
        tr.appendChild(description);
        tr.appendChild(value);
        table.appendChild(tr);
    }

}

function reTestAlg(){
    var lastTest = algorithmHistory[algorithmHistory.length-1];
    console.log(lastTest);
    if (lastTest==undefined){
        return;
    }
    cube.resetCube();
    doAlg(lastTest.scramble, false);
    console.log("ok");
    updateVirtualCube();

}

function updateTrainer(scramble, solutions, algorithm, timer){
    if (scramble!=null){
        document.getElementById("scramble").innerHTML = scramble;
    }
    if (solutions!=null){
        document.getElementById("algdisp").innerHTML = solutions;
    }

    if (algorithm!=null){
        cube.resetCube();
        doAlg(algorithm, false);
    }

    if (timer!=null){
        document.getElementById("timer").innerHTML = timer;
    }
}
function fixAlgorithms(algorithms){
    //for now this just removes brackets
    var i = 0;
    for (;i<algorithms.length;i++){
        // console.log(algorithms[i]);
        let currAlg = algorithms[i].replace(/\[|\]|\)|\(/g, "");
        // currAlg = commToMoves(currAlg);
        // console.log(currAlg);

        // don't simplifify for now
        // if (!isCommutator(currAlg)) {
        //     algorithms[i] = alg.cube.simplify(currAlg);
        // }
        
    }
    return algorithms;
    //TODO Allow commutators

}

function validTextColour(stringToTest) {
    if (stringToTest === "") { return false; }
    if (stringToTest === "inherit") { return false; }
    if (stringToTest === "transparent") { return false; }

    var visualCubeColoursArray = ['black', 'dgrey', 'grey', 'silver', 'white', 'yellow', 
                                  'red', 'orange', 'blue', 'green', 'purple', 'pink'];

    if (stringToTest[0] !== '#') {
        return visualCubeColoursArray.indexOf(stringToTest) > -1;
    } else {
        return /^#[0-9A-F]{6}$/i.test(stringToTest)
    }
}

function stripLeadingHashtag(colour){
    if (colour[0] == '#'){
        return colour.substring(1);
    }

    return colour;
}


function displayAlgorithm(algTest, reTest=true){    
    //If reTest is true, the scramble will also be setup on the virtual cube
    if (reTest){
        reTestAlg();
    }

    updateTrainer(algTest.scramble, algTest.solutions.join("<br><br>"), null, null);

    scramble.style.color = '#e6e6e6';
}

function displayAlgorithmFromHistory(index){    

    var algTest = algorithmHistory[index];

    console.log( algTest );

    var timerText;
    if (algTest.solveTime == null){
        timerText = 'n/a'
    } else {
        timerText = algTest.solveTime.toString()
    }

    updateTrainer(
        "<span style=\"color: #90f182\">" + algTest.orientRandPart + "</span>" + " "+ algTest.scramble, 
        algTest.solutions.join("<br><br>"), 
        algTest.preorientation + algTest.scramble, 
        timerText
    );

    scramble.style.color = '#e6e6e6';
}

function displayAlgorithmForPreviousTest(reTest=true){//not a great name

    var lastTest = algorithmHistory[algorithmHistory.length-1];
    if (lastTest==undefined){
        return;
    }
    //If reTest is true, the scramble will also be setup on the virtual cube
    if (reTest){
        reTestAlg();
    }

    updateTrainer("<span style=\"color: #90f182\">" + lastTest.orientRandPart + "</span>" + " "+ lastTest.scramble, lastTest.solutions.join("<br><br>"), null, null);

    scramble.style.color = '#e6e6e6';
}

function randomFromList(set){

    if (document.getElementById("goInOrder").checked){
        return set[currentAlgIndex++%set.length];
    }   

    var size = set.length;
    var rand = Math.floor(Math.random()*size);

    return set[rand];

}
var starttime;
var timerUpdateInterval;
var timerIsRunning = false;
function startTimer(){

    if (timerIsRunning){
        return;
    }

    if (document.getElementById("timer").style.display == 'none'){
        //don't do anything if timer is hidden
        return;
    }
    starttime = Date.now();
    timerUpdateInterval = setInterval(updateTimer, 1);
    timerIsRunning = true;
}

function stopTimer(logTime=true){

    if (!timerIsRunning){
        return;
    }

    if (document.getElementById("timer").style.display == 'none'){
        //don't do anything if timer is hidden
        return;
    }


    clearInterval(timerUpdateInterval);
    timerIsRunning = false;

    var time = parseFloat(document.getElementById("timer").innerHTML);
    if (isNaN(time)){
        return NaN;
    }


    if (logTime){
        var lastTest = algorithmHistory[algorithmHistory.length-1];
        var solveTime = new SolveTime(time,'');
        lastTest.solveTime = solveTime;
        timeArray.push(solveTime);
        console.log(timeArray);
        updateTimeList();
    }

    updateStats();
    return time;
}

function updateTimer(){
    document.getElementById("timer").innerHTML = ((Date.now()-starttime)/1000).toFixed(2);
}
var timeArray = [];

function getMean(timeArray){
    var i;
    var total = 0;
    for(i=0;i<timeArray.length;i++){
        total += timeArray[i].timeValue();
    }

    return total/timeArray.length;
}

function updateStats(){
    var statistics = document.getElementById("statistics");

    statistics.innerHTML = "&nbsp";

    if (timeArray.length!=0){
        statistics.innerHTML += "Mean of " + timeArray.length + ": " + getMean(timeArray).toFixed(2) + "<br>";
    }

}



function updateTimeList(){
    var i;
    var timeList = document.getElementById("timeList");
    var scrollTimes = document.getElementById("scrollTimes");
    timeList.innerHTML = "&nbsp";
    for (i=0; i<timeArray.length;i++){
        timeList.innerHTML += timeArray[i].toString();
        timeList.innerHTML += " ";
    }
    scrollTimes.scrollTop = scrollTimes.scrollHeight;
}

//Create Checkboxes for each subset
//Each subset has id of subset name, and is followed by text of subset name.

// function createAlgsetPicker(){
//     var algsetPicker = document.getElementById("algsetpicker")
//     for (var set in window.algs){
//         var option = document.createElement("option")
//         option.text = set;
//         algsetPicker.add(option);

//     }
//     //algsetPicker.size = Object.keys(window.algs).length
// }



// function createCheckboxes(){

//     var set = document.getElementById("algsetpicker").value;


//     var full_set = window.algs[set];

//     if (!full_set){
//         set = document.getElementById("algsetpicker").options[0].value;
//         document.getElementById("algsetpicker").value = set;
//         full_set = window.algs[set]
//     }
//     var subsets = Object.keys(full_set);

//     var myDiv = document.getElementById("cboxes");

//     myDiv.innerHTML = "";

//     for (var i = 0; i < subsets.length; i++) {
//         var checkBox = document.createElement("input");
//         var label = document.createElement("label");
//         checkBox.type = "checkbox";
//         checkBox.value = subsets[i];
//         checkBox.onclick = function(){
//             currentAlgIndex = 0;
//             shouldRecalculateStatistics=true; 
//             //Every time a checkbox is pressed, the algset statistics should be updated.

//             var checkboxes = document.querySelectorAll('#cboxes input[type="checkbox"]');
//             const anyUnchecked = Array.from(checkboxes).some(checkbox => !checkbox.checked);
//             toggleAlgsetSelectAll.textContent = anyUnchecked ? 'Select All' : 'Unselect All';
//         }
//         checkBox.setAttribute("id", set.toLowerCase() +  subsets[i]);

//         myDiv.appendChild(checkBox);
//         myDiv.appendChild(label);
//         label.appendChild(document.createTextNode(subsets[i]));
//     }
// }

// var toggleAlgsetSelectAll = document.getElementById("toggleAlgsetSelectAll");
// toggleAlgsetSelectAll.addEventListener('click', () => {
//     var checkboxes = document.querySelectorAll('#cboxes input[type="checkbox"]');
//     const anyUnchecked = Array.from(checkboxes).some(checkbox => !checkbox.checked);
//     checkboxes.forEach(checkbox => checkbox.checked = anyUnchecked);
//     toggleAlgsetSelectAll.textContent = !anyUnchecked ? 'Select All' : 'Unselect All';
// });

function clearSelectedAlgsets(){
    var elements = document.getElementById("algsetpicker").options;
    for(var i = 0; i < elements.length; i++){
        elements[i].selected = false;
    }
}

function findMistakesInUserAlgs(userAlgs){
    var errorMessage = "";
    var newList = [];
    var newListDisplay = [] // contains all valid algs + commented algs
    for (var i = 0; i < userAlgs.length; i++){
        if (userAlgs[i].trim().startsWith("#")){
            // Allow 'commenting' of algs with #, like python
            newListDisplay.push(userAlgs[i]);
            continue;
        }
        userAlgs[i] = userAlgs[i].replace(/[\u2018\u0060\u2019\u00B4]/g, "'");  
        userAlgs[i] = userAlgs[i].replace(/"/g, "");  
        //replace astrophe like characters with '
        if (!isCommutator(userAlgs[i])) {
            try {
                alg.cube.simplify(userAlgs[i]);
                if (userAlgs[i].trim()!="" ){
                    newList.push(userAlgs[i]);
                    newListDisplay.push(userAlgs[i]);
                }
            }
            catch(err){
                errorMessage += "\"" + userAlgs[i] + "\"" + " is an invalid alg and has been removed\n";
            }
        }
        else {
            // TODO: check valid comms
            newList.push(userAlgs[i]);
            newListDisplay.push(userAlgs[i]);
        }
        
    }

    if (errorMessage!=""){
        alert(errorMessage);
    }

    document.getElementById("userDefinedAlgs").value = newListDisplay.join("\n");
    localStorage.setItem("userDefinedAlgs", newList.join("\n"));
    return newList;
}

function createAlgList(){
    algList = findMistakesInUserAlgs(document.getElementById("userDefinedAlgs").value.split("\n"));
    if (algList.length == 0){
        alert("Please enter some algs into the User Defined Algs box.");
    }
    return algList;
}

function mirrorAlgsAcrossAxis(algList, axis="M"){
    algList = fixAlgorithms(algList);
    if (axis=="M"){
        return algList.map(x => alg.cube.mirrorAcrossM(x));
    }
    else {
        return algList.map(x => alg.cube.mirrorAcrossS(x));
    }
}

function averageMovecount(algList, metric, includeAUF){

    var totalmoves = 0;
    var i = 0;
    for (; i<algList.length; i++){
        var topAlg = algList[i].split("!")[0];
        topAlg = topAlg.replace(/\[|\]|\)|\(/g, "");
        // convert to moves if in comm notation
        // console.log(topAlg);
        topAlg = commToMoves(topAlg);
        // console.log(topAlg);

        var moves = alg.cube.simplify(alg.cube.expand(alg.cube.fromString(topAlg)));
        
        if (!includeAUF){
            while (moves[0].base === "U" || moves[0].base === "y") {
                moves.splice(0, 1)
            }
            while (moves[moves.length - 1].base === "U" || moves[moves.length - 1].base === "y") {
                moves.splice(moves.length - 1)
            }
        }
        totalmoves += alg.cube.countMoves(moves, {"metric": metric});
    }

    return totalmoves/algList.length;
}

function toggleVirtualCube(){
    var sim = document.getElementById("simcube");

    if (sim.style.display == 'none'){
        sim.style.display = 'block';
    }
    else {
        sim.style.display = 'none';
    }
}

function setVirtualCube(setting){
    var sim = document.getElementById("simcube");
    if (setting){
        sim.style.display = 'block';
    } else {
        sim.style.display = 'none';
        document.getElementById("timer").style.display = 'block'; //timer has to be shown when simulator cube is not used
        document.getElementById("hideTimer").checked = false;
    }
}

function setTimerDisplay(setting){
    var timer = document.getElementById("timer");
    if (!isUsingVirtualCube()){
        alert("The timer can only be hidden when using the simulator cube.");
        document.getElementById("hideTimer").checked = false;
    }
    else if (setting){
        timer.style.display = 'block';
    } else {
        timer.style.display = 'none';
    }
}

function isUsingVirtualCube(){
    var sim = document.getElementById("simcube")

    if (sim.style.display == 'none'){
        return false;
    }
    else {
        return true;
    }
}


var listener = new Listener();

var lastKeyMap = null;

var historyIndex;

function nextScramble(displayReady=true){
    document.getElementById("scramble").style.color = "white";
    stopTimer(false);
    if (displayReady){
        document.getElementById("timer").innerHTML = 'Ready';
    };
    if (isUsingVirtualCube() ){
        testAlg(generateAlgTest());
        if (isIncludeRecognitionTime) {
            console.log("start timer");
            startTimer();
        } 
    }
    else {
        testAlg(generateAlgTest());
    }
    historyIndex = algorithmHistory.length - 1;
}


function handleLeftButton() {
    if (algorithmHistory.length<=1 || timerIsRunning){
        return;
    }
    historyIndex--;

    if (historyIndex<0){
        alert('Reached end of solve log');
        historyIndex = 0;
    }
    displayAlgorithmFromHistory(historyIndex);
}

function handleRightButton() {
    if (timerIsRunning){
        return;
    }
    historyIndex++;
    if (historyIndex>=algorithmHistory.length){
        nextScramble();
        doNothingNextTimeSpaceIsPressed = false;
        return;
    }

    displayAlgorithmFromHistory(historyIndex);
}

try { //only for mobile
document.getElementById("onscreenLeft").addEventListener("click", handleLeftButton);
document.getElementById("onscreenRight").addEventListener("click", handleRightButton);
} catch (error) {

}

function updateControls() {
    let keymaps = getKeyMaps();

    if (JSON.stringify(keymaps) === JSON.stringify(lastKeyMap)) {
        return false;
    }

    lastKeyMap = keymaps;

    listener.reset();

    keymaps.forEach(function(keymap){
        listener.register(keymap[0], function() {  doAlg(keymap[1], true) });
    });
    listener.register(new KeyCombo("Backspace"), function() { displayAlgorithmForPreviousTest();});
    listener.register(new KeyCombo("Escape"), function() {
        if (isUsingVirtualCube()){
            stopTimer(false);
        }
        reTestAlg();
        document.getElementById("scramble").innerHTML = "&nbsp;";
        document.getElementById("algdisp").innerHTML = "";
    });
    listener.register(new KeyCombo("Enter"), function() {
        nextScramble();
        doNothingNextTimeSpaceIsPressed = false;
    });
    listener.register(new KeyCombo("Tab"), function() {
        nextScramble();
        doNothingNextTimeSpaceIsPressed = false;
    });
    listener.register(new KeyCombo("ArrowLeft"), handleLeftButton);
    listener.register(new KeyCombo("ArrowRight"), handleRightButton);
}

setInterval(updateControls, 300);


function release(event) {
    if (event.key == " " || event.type=="touchend") { //space
        if (document.activeElement.type == "text"){
            return;
        }
        if (document.activeElement.type == "textarea"){
            return;
        }

        document.getElementById("timer").style.color = "white"; //Timer should never be any color other than white when space is not pressed down
        if (!isUsingVirtualCube()){
            if (document.getElementById("algdisp").innerHTML == ""){
                //Right after a new scramble is displayed, space starts the timer


                if (doNothingNextTimeSpaceIsPressed){
                    doNothingNextTimeSpaceIsPressed = false;
                }
                else {
                    startTimer(); 
                }
            }
        }
    }
};
document.onkeyup = release
try { //only for mobile
document.getElementById("touchStartArea").addEventListener("touchend", release);
} catch(error) {

}

var doNothingNextTimeSpaceIsPressed = true;
function press(event) { //Stops the screen from scrolling down when you press space
    
    if (event.key == " " || event.type == "touchstart") { //space
        if (document.activeElement.type == "text"){
            return;
        }

        if (document.activeElement.type == "textarea"){
            return;
        }

        event.preventDefault();
        if (!event.repeat){
            if (isUsingVirtualCube()){
                if (timerIsRunning){
                    stopTimer();
                    displayAlgorithmForPreviousTest();//put false here if you don't want the cube to retest.
                    //window.setTimeout(function (){reTestAlg();}, 250);
                }
                else {
                    displayAlgorithmForPreviousTest();
                }

            }
            else { //If not using virtual cube
                if (timerIsRunning){//If timer is running, stop timer
                    var time = stopTimer();
                    doNothingNextTimeSpaceIsPressed = true;
                    if (document.getElementById("goToNextCase").checked){
                        nextScramble(false);

                        //document.getElementById("timer").innerHTML = time;
                    } else {
                        displayAlgorithmForPreviousTest();
                    }

                }
                else if (document.getElementById("algdisp").innerHTML != ""){
                    nextScramble(); //If the solutions are currently displayed, space should test on the next alg.

                    doNothingNextTimeSpaceIsPressed = true;
                }

                else if (document.getElementById("timer").innerHTML == "Ready"){
                    document.getElementById("timer").style.color = "green";
                }
            }
        }
    }

};
document.onkeydown = press;
try { //only for mobile
    document.getElementById("touchStartArea").addEventListener("touchstart", press);
} catch (error) {

}


class SolveTime {
    constructor(time, penalty) {
        this.time = time;
        this.penalty = penalty;
    }

    toString(decimals=2) {
        var timeString = this.time.toFixed(decimals)
        switch (this.penalty) {
            case '+2':
                return (this.time + 2).toFixed(decimals) + '+';
            case 'DNF':
                return 'DNF' + "(" + timeString + ")";
            default:
                return timeString;
        }
    }

    timeValue() {

        switch (this.penalty) {
            case '+2':
                return this.time + 2;
            case 'DNF':
                return Infinity;
            default:
                return this.time;
        }
    }

}


const nextScrambleButton = document.querySelector('button[name="nextScrambleButton"]');
if (nextScrambleButton)
    nextScrambleButton.addEventListener('click', nextScramble);

const showSolutionButton = document.querySelector('button[name="showSolutionButton"]');
if (showSolutionButton)
    showSolutionButton.addEventListener('click', displayAlgorithmForPreviousTest);



//CUBE OBJECT
function RubiksCube() {
    this.cubestate = [
        [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], 
        [2, 9], [2, 10], [2, 11], [2, 12], [2, 13], [2, 14], [2, 15], [2, 16], [2, 17], 
        [3, 18], [3, 19], [3, 20], [3, 21], [3, 22], [3, 23], [3, 24], [3, 25], [3, 26], 
        [4, 27], [4, 28], [4, 29], [4, 30], [4, 31], [4, 32], [4, 33], [4, 34], [4, 35], 
        [5, 36], [5, 37], [5, 38], [5, 39], [5, 40], [5, 41], [5, 42], [5, 43], [5, 44], 
        [6, 45], [6, 46], [6, 47], [6, 48], [6, 49], [6, 50], [6, 51], [6, 52], [6, 53]
    ];

    this.resetCube = function(){
        this.cubestate = [
            [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], 
            [2, 9], [2, 10], [2, 11], [2, 12], [2, 13], [2, 14], [2, 15], [2, 16], [2, 17], 
            [3, 18], [3, 19], [3, 20], [3, 21], [3, 22], [3, 23], [3, 24], [3, 25], [3, 26], 
            [4, 27], [4, 28], [4, 29], [4, 30], [4, 31], [4, 32], [4, 33], [4, 34], [4, 35], 
            [5, 36], [5, 37], [5, 38], [5, 39], [5, 40], [5, 41], [5, 42], [5, 43], [5, 44], 
            [6, 45], [6, 46], [6, 47], [6, 48], [6, 49], [6, 50], [6, 51], [6, 52], [6, 53]
        ];
    }

    this.resetCubestate = function(){
        var face = 1;
        for (var i = 0; i < 6; ++i) {
            for (var j = 0; j < 9; ++j) {
                this.cubestate[9*i + j][0] = face;
            }

            ++face;
        }
    }

    this.resetMask = function(){
        var face = 1;
        for (var i = 0; i < 6; ++i) {
            for (var j = 0; j < 9; ++j) {
                this.cubestate[9*i + j][1] = 9*i + j;
            }

            ++face;
        }
    }

    this.getMaskValues = function(){
        return this.cubestate.map(facelet => facelet[1]);
    }

    this.solution = function(){
        var gcube = Cube.fromString(this.toString());
        return gcube.solve();
    }

    this.isSolved = function(initialMask=""){
        for (var i = 0; i<6;i++){
            let uniqueColorsOnFace = new Set();

            for (var j = 0; j<9; j++){
                // console.log(this.toString());
                // console.log(initialMask);
                if (initialMask.length == 54 && initialMask[this.cubestate[9*i + j][1]] == 'x') {
                    continue;
                }
                uniqueColorsOnFace.add(this.cubestate[9*i + j][0]);
            }

            if (uniqueColorsOnFace.size > 1) {
                return false;
            }
        }
        return true;
    }
    this.wcaOrient = function() {
        // u-r--f--d--l--b
        // 4 13 22 31 40 49
        //
        var moves = "";

        if (this.cubestate[13][0]==1) {//R face
            this.doAlgorithm("z'");
            moves +="z'";
        } else if (this.cubestate[22][0]==1) {//on F face
            this.doAlgorithm("x");
            moves+="x";
        } else if (this.cubestate[31][0]==1) {//on D face
            this.doAlgorithm("x2");
            moves+="x2";
        } else if (this.cubestate[40][0]==1) {//on L face
            this.doAlgorithm("z");
            moves+="z";
        } else if (this.cubestate[49][0]==1) {//on B face
            this.doAlgorithm("x'");
            moves+="x'";
        }

        if (this.cubestate[13][0]==3) {//R face
            this.doAlgorithm("y");
            moves+=" y";
        } else if (this.cubestate[40][0]==3) {//on L face
            this.doAlgorithm("y'");
            moves+=" y'";
        } else if (this.cubestate[49][0]==3) {//on B face
            this.doAlgorithm("y2");
            moves+=" y2";
        }

        return moves;
    }

    this.toString = function(){
        var str = "";
        var i;
        var sides = ["U","R","F","D","L","B"]
        for(i=0;i<this.cubestate.length;i++){
            str+=sides[this.cubestate[i][0]-1];
        }
        // console.log(str);
        return str;
    }

    this.toInitialMaskedString = function(initialMask){
        var str = "";
        var i;
        var sides = ["U","R","F","D","L","B"]
        for(i=0;i<this.cubestate.length;i++){
            if (initialMask[this.cubestate[i][1]] == 'x') {
                str += 'x';
            } else {
                str += sides[this.cubestate[i][0]-1];
            }
        }
        return str;
    }


    this.test = function(alg){
        this.doAlgorithm(alg);
        updateVirtualCube();
    }

    this.doAlgorithm = function(alg) {
        if (!alg || alg == "") return;

        var moveArr = alg.split(/(?=[A-Za-z])/);
        var i;

        for (i = 0;i<moveArr.length;i++) {
            var move = moveArr[i];
            var myRegexp = /([RUFBLDrufbldxyzEMS])(\d*)('?)/g;
            var match = myRegexp.exec(move.trim());


            if (match!=null) {

                var side = match[1];

                var times = 1;
                if (!match[2]=="") {
                    times = match[2] % 4;
                }

                if (match[3]=="'") {
                    times = (4 - times) % 4;
                }

                switch (side) {
                    case "R":
                        this.doR(times);
                        break;
                    case "U":
                        this.doU(times);
                        break;
                    case "F":
                        this.doF(times);
                        break;
                    case "B":
                        this.doB(times);
                        break;
                    case "L":
                        this.doL(times);
                        break;
                    case "D":
                        this.doD(times);
                        break;
                    case "r":
                        this.doRw(times);
                        break;
                    case "u":
                        this.doUw(times);
                        break;
                    case "f":
                        this.doFw(times);
                        break;
                    case "b":
                        this.doBw(times);
                        break;
                    case "l":
                        this.doLw(times);
                        break;
                    case "d":
                        this.doDw(times);
                        break;
                    case "x":
                        this.doX(times);
                        break;
                    case "y":
                        this.doY(times);
                        break;
                    case "z":
                        this.doZ(times);
                        break;
                    case "E":
                        this.doE(times);
                        break;
                    case "M":
                        this.doM(times);
                        break;
                    case "S":
                        this.doS(times);
                        break;

                }
            } else {

                console.log("Invalid alg, or no alg specified:" + alg + "|");

            }

        }

    }

    this.solveNoRotate = function(){
        //Center sticker indexes: 4, 13, 22, 31, 40, 49
        var cubestate = this.cubestate;
        this.cubestate = [cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],
                          cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],
                          cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],
                          cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],
                          cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],
                          cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49]];
    }

    this.doU = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.cubestate = [cubestate[6], cubestate[3], cubestate[0], cubestate[7], cubestate[4], cubestate[1], cubestate[8], cubestate[5], cubestate[2], cubestate[45], cubestate[46], cubestate[47], cubestate[12], cubestate[13], cubestate[14], cubestate[15], cubestate[16], cubestate[17], cubestate[9], cubestate[10], cubestate[11], cubestate[21], cubestate[22], cubestate[23], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[30], cubestate[31], cubestate[32], cubestate[33], cubestate[34], cubestate[35], cubestate[18], cubestate[19], cubestate[20], cubestate[39], cubestate[40], cubestate[41], cubestate[42], cubestate[43], cubestate[44], cubestate[36], cubestate[37], cubestate[38], cubestate[48], cubestate[49], cubestate[50], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doR = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;

            this.cubestate = [cubestate[0], cubestate[1], cubestate[20], cubestate[3], cubestate[4], cubestate[23], cubestate[6], cubestate[7], cubestate[26], cubestate[15], cubestate[12], cubestate[9], cubestate[16], cubestate[13], cubestate[10], cubestate[17], cubestate[14], cubestate[11], cubestate[18], cubestate[19], cubestate[29], cubestate[21], cubestate[22], cubestate[32], cubestate[24], cubestate[25], cubestate[35], cubestate[27], cubestate[28], cubestate[51], cubestate[30], cubestate[31], cubestate[48], cubestate[33], cubestate[34], cubestate[45], cubestate[36], cubestate[37], cubestate[38], cubestate[39], cubestate[40], cubestate[41], cubestate[42], cubestate[43], cubestate[44], cubestate[8], cubestate[46], cubestate[47], cubestate[5], cubestate[49], cubestate[50], cubestate[2], cubestate[52], cubestate[53]]
        }

    }

    this.doF = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[3], cubestate[4], cubestate[5], cubestate[44], cubestate[41], cubestate[38], cubestate[6], cubestate[10], cubestate[11], cubestate[7], cubestate[13], cubestate[14], cubestate[8], cubestate[16], cubestate[17], cubestate[24], cubestate[21], cubestate[18], cubestate[25], cubestate[22], cubestate[19], cubestate[26], cubestate[23], cubestate[20], cubestate[15], cubestate[12], cubestate[9], cubestate[30], cubestate[31], cubestate[32], cubestate[33], cubestate[34], cubestate[35], cubestate[36], cubestate[37], cubestate[27], cubestate[39], cubestate[40], cubestate[28], cubestate[42], cubestate[43], cubestate[29], cubestate[45], cubestate[46], cubestate[47], cubestate[48], cubestate[49], cubestate[50], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doD = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[3], cubestate[4], cubestate[5], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[12], cubestate[13], cubestate[14], cubestate[24], cubestate[25], cubestate[26], cubestate[18], cubestate[19], cubestate[20], cubestate[21], cubestate[22], cubestate[23], cubestate[42], cubestate[43], cubestate[44], cubestate[33], cubestate[30], cubestate[27], cubestate[34], cubestate[31], cubestate[28], cubestate[35], cubestate[32], cubestate[29], cubestate[36], cubestate[37], cubestate[38], cubestate[39], cubestate[40], cubestate[41], cubestate[51], cubestate[52], cubestate[53], cubestate[45], cubestate[46], cubestate[47], cubestate[48], cubestate[49], cubestate[50], cubestate[15], cubestate[16], cubestate[17]];
        }

    }

    this.doL = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.cubestate = [cubestate[53], cubestate[1], cubestate[2], cubestate[50], cubestate[4], cubestate[5], cubestate[47], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[12], cubestate[13], cubestate[14], cubestate[15], cubestate[16], cubestate[17], cubestate[0], cubestate[19], cubestate[20], cubestate[3], cubestate[22], cubestate[23], cubestate[6], cubestate[25], cubestate[26], cubestate[18], cubestate[28], cubestate[29], cubestate[21], cubestate[31], cubestate[32], cubestate[24], cubestate[34], cubestate[35], cubestate[42], cubestate[39], cubestate[36], cubestate[43], cubestate[40], cubestate[37], cubestate[44], cubestate[41], cubestate[38], cubestate[45], cubestate[46], cubestate[33], cubestate[48], cubestate[49], cubestate[30], cubestate[51], cubestate[52], cubestate[27]];
        }

    }

    this.doB = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.cubestate = [cubestate[11], cubestate[14], cubestate[17], cubestate[3], cubestate[4], cubestate[5], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[35], cubestate[12], cubestate[13], cubestate[34], cubestate[15], cubestate[16], cubestate[33], cubestate[18], cubestate[19], cubestate[20], cubestate[21], cubestate[22], cubestate[23], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[30], cubestate[31], cubestate[32], cubestate[36], cubestate[39], cubestate[42], cubestate[2], cubestate[37], cubestate[38], cubestate[1], cubestate[40], cubestate[41], cubestate[0], cubestate[43], cubestate[44], cubestate[51], cubestate[48], cubestate[45], cubestate[52], cubestate[49], cubestate[46], cubestate[53], cubestate[50], cubestate[47]];
        }

    }

    this.doE = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[3], cubestate[4], cubestate[5], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[21], cubestate[22], cubestate[23], cubestate[15], cubestate[16], cubestate[17], cubestate[18], cubestate[19], cubestate[20], cubestate[39], cubestate[40], cubestate[41], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[30], cubestate[31], cubestate[32], cubestate[33], cubestate[34], cubestate[35], cubestate[36], cubestate[37], cubestate[38], cubestate[48], cubestate[49], cubestate[50], cubestate[42], cubestate[43], cubestate[44], cubestate[45], cubestate[46], cubestate[47], cubestate[12], cubestate[13], cubestate[14], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doM = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[52], cubestate[2], cubestate[3], cubestate[49], cubestate[5], cubestate[6], cubestate[46], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[12], cubestate[13], cubestate[14], cubestate[15], cubestate[16], cubestate[17], cubestate[18], cubestate[1], cubestate[20], cubestate[21], cubestate[4], cubestate[23], cubestate[24], cubestate[7], cubestate[26], cubestate[27], cubestate[19], cubestate[29], cubestate[30], cubestate[22], cubestate[32], cubestate[33], cubestate[25], cubestate[35], cubestate[36], cubestate[37], cubestate[38], cubestate[39], cubestate[40], cubestate[41], cubestate[42], cubestate[43], cubestate[44], cubestate[45], cubestate[34], cubestate[47], cubestate[48], cubestate[31], cubestate[50], cubestate[51], cubestate[28], cubestate[53]];
        }

    }

    this.doS = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[43], cubestate[40], cubestate[37], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[3], cubestate[11], cubestate[12], cubestate[4], cubestate[14], cubestate[15], cubestate[5], cubestate[17], cubestate[18], cubestate[19], cubestate[20], cubestate[21], cubestate[22], cubestate[23], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[16], cubestate[13], cubestate[10], cubestate[33], cubestate[34], cubestate[35], cubestate[36], cubestate[30], cubestate[38], cubestate[39], cubestate[31], cubestate[41], cubestate[42], cubestate[32], cubestate[44], cubestate[45], cubestate[46], cubestate[47], cubestate[48], cubestate[49], cubestate[50], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doX = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.doR(1);
            this.doM(3);
            this.doL(3);
        }
    }

    this.doY = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;

            this.doU(1);
            this.doE(3);
            this.doD(3);
        }
    }

    this.doZ = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;

            this.doF(1);
            this.doS(1);
            this.doB(3);
        }
    }

    this.doUw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.doE(3);
            this.doU(1);

        }

    }

    this.doRw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.doM(3);
            this.doR(1);
        }

    }

    this.doFw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.doS(1);
            this.doF(1);
        }

    }

    this.doDw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.doE(1);
            this.doD(1);
        }

    }

    this.doLw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.doM(1);
            this.doL(1);
        }

    }

    this.doBw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            var cubestate = this.cubestate;
            this.doS(3);
            this.doB(1);
        }

    }
}

