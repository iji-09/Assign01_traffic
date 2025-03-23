let port;  // 시리얼 포트 객체
let isConnected = false;
let selectedPort = null;
let portSelect;

// 신호등 기본기능 시간 및 설정 변수
let redTime = 2000, yellowTime = 500, greenTime = 2000;
let brightness = 255;
let greenBlinkInterval = 166;

let currentLight = "red"; // 현재 신호등 상태
let mode = "normal"; // 기본 모드

let isBlinking = false; // 모든 LED가 깜빡이는 상태
let isRedOnly = false; // 빨간불 전용 모드
let isTraffic = true; // 신호등 작동 여부

let isGreenBlink = false; // 초록불 깜빡이기

let blinkCount = 0;
let lastChange = 0;

let ledOn = false; // LED 켜진 상태



async function setup() {
    createCanvas(500, 600);
    background(240);

    //-------------슬라이더 생성---------------

    // 슬라이더 생성 위치
    let sliderX = 30;
    let sliderY = 280;

    // 밝기 조절 슬라이더 (0~255 범위, 초기값 255)
    brightnessSlider = createSlider(0, 255, 255);
    brightnessSlider.position(sliderX, sliderY);
    brightnessSlider.input(sendBrightnessData);


    // 시간 조절 슬라이더
    sliderY += 50;
    // 빨간불 시간 (1000~5000, 초기값 = redTime)
    redSlider = createSlider(1000, 5000, redTime);
    redSlider.position(sliderX, sliderY);

    sliderY += 50;
    // 노란불 시간 (200~2000, 초기값 = yellowTime)
    yellowSlider = createSlider(200, 2000, yellowTime);
    yellowSlider.position(sliderX, sliderY);

    sliderY += 50;
    // 초록불 시간 (1000~5000, 초기값 = greenTime)
    greenSlider = createSlider(1000, 5000, greenTime);
    greenSlider.position(sliderX, sliderY);
    


    //-------------------UI 버튼 요소 생성---------------------
    
    lastChange = millis();

    let connectButton = createButton("아두이노 연결/해제");
    connectButton.position(30, 30);
    connectButton.mousePressed(() => connectBtnClick(portSelect));

    let redButton = createButton("BUTTON 1: red only");
    redButton.position(300, 250);
    redButton.mousePressed(toggleRedOnly);

    let blinkButton = createButton("BUTTON 2: all blink");
    blinkButton.position(300, 325);
    blinkButton.mousePressed(toggleBlinking);

    let trafficButton = createButton("BUTTON 3: traffic light");
    trafficButton.position(300, 400);
    trafficButton.mousePressed(toggleTraffic);


}

// 아두이노 연결 버튼 클릭 시 실행
async function connectBtnClick(portSelect) {
    if (!isConnected) {
        try {
            selectedPort = await navigator.serial.requestPort(); // 포트 선택 창 표시
            await selectedPort.open({ baudRate: 9600 });
            port = selectedPort;
            isConnected = true;
            console.log("Connect Arduino");
            readSerialData(); // 데이터 수신 시작

        } 
        catch (error) {
            console.error("serial error:", error);
        }
    } 
    else {
        await port.close();
        isConnected = false;
        console.log("Arduino connecting canceled");
    }
}

// 시리얼 데이터 수신
let serialBuffer = "";
async function readSerialData() {
    while (port.readable && isConnected) {
        const reader = port.readable.getReader();
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                let decoder = new TextDecoder("utf-8");
                let chunk = decoder.decode(value, { stream: true });
                serialBuffer += chunk;

                let lines = serialBuffer.split("\n");
                for (let i = 0; i < lines.length - 1; i++) {
                    //console.log("from Arduino:", lines[i].trim());
                    updateTrafficState(lines[i].trim());
                }
                serialBuffer = lines[lines.length - 1];
            }
        } catch (error) {
            console.error("data error:", error);
        } finally {
            reader.releaseLock();
        }
    }
}


// 신호등 상태 업데이트
function updateTrafficState(data) {
    if (data === "RED") currentLight = "red";
    else if (data === "YELLOW") currentLight = "yellow";
    else if (data === "GREEN") currentLight = "green";
    else if (data === "GREENBLINK") currentLight = "greenBlink";
    else if (data === "YELLOW2") currentLight = "yellow2";

    if (data.startsWith("BRIGHTNESS:")) {
        let newBrightness = parseInt(data.split(":")[1].trim(), 10);
        brightnessSlider.value(newBrightness); // 슬라이더 값 업데이트
        brightness = newBrightness; // 내부 변수도 업데이트
        //console.log("Arduino → p5: brightness:", newBrightness);
    }
    
    
    // 버튼 상태 업데이트 (아두이노에서 버튼이 눌렸을 때)
    else if (data === "BUTTON1_ON") {
        isRedOnly = true;
        isTraffic = false;
        isBlinking = false;
        mode = "red-only"; 
        currentLight = "red";
        console.log("Arduino B1 On");
    } 
    else if (data === "BUTTON1_OFF") {
        isRedOnly = false;
        isTraffic = true;
        mode = "normal";
        console.log("Arduino B1 Off");
    }

    else if (data === "BUTTON2_ON") {
        isBlinking = true;
        isRedOnly = false;
        isTraffic = false;
        mode = "blinking";
        console.log("Arduino B2 On");
    }
    else if (data === "BUTTON2_OFF") {
        isBlinking = false;
        isTraffic = true;
        stopAll();
        mode = "normal";
        console.log("Arduino B2 Off");
    }

    else if (data === "BUTTON3_ON") {
        stopAll();
        isTraffic = true;
        mode = "normal";
        console.log("Arduino B3 On");
    }
    else if (data === "BUTTON3_OFF") {
        stopAll();
        console.log("Arduino B3 Off");
    }
}

// 밝기조절 전송 함수
function sendBrightnessData() {
    if (port && port.writable) {
        let brightnessValue = brightnessSlider.value();
        sendSerialData("BRIGHTNESS_SET:" + brightnessValue);
        console.log("p5 → Arduino: BRIGHTNESS_SET:", brightnessValue);
    }
}


// 시리얼 데이터 전송 함수
async function sendSerialData(data) {
    if (port && port.writable) {
        const writer = port.writable.getWriter();
        await writer.write(new TextEncoder().encode(data + "\n"));
        writer.releaseLock();
    }
}

//---------------------------------//
//          버튼 기능 구현          //
//---------------------------------//


// 모든 기능 OFF
function stopAll() {    
    isBlinking = false;
    isRedOnly = false;
    isTraffic = false;
    // 모드를 "stopped"로 바꿔서 어떤 기능도 없는 상태로 만듦
    mode = "stopped";
    //console.log("All stop");
    
    // 화면 표시를 위해 lastChange를 초기화
    lastChange = millis();
}


//------------------BUTTON 1: RED LED ON/OFF----------------------
function toggleRedOnly() {

    // 빨간 LED만 켜진 상태가 아니라면(신호등이거나 깜빡이거나)
    if (mode !== "red-only") { 
        stopAll();  // 모든 기능 종료
        // 빨간불 전용 모드 ON
        sendSerialData("r");
        isRedOnly = true; 
        mode = "red-only";
        currentLight = "red";  
        console.log("p5 / Red Led only ON");
    } 
    // 빨간 LED만 켜져있는 상태라면
    else if(mode === "red-only") {
        mode = !mode;
        stopAll();  // 모든 기능 종료

        sendSerialData("1");
        isTraffic = true;
        mode = "normal";
        console.log("p5 / Red Led only OFF");
        
    }
}
    

// -------------------BUTTON 2: ALL LED BLINKING-------------------
function toggleBlinking() {

    // 모든 LED가 깜빡이는 상태가 아니라면(신호등이거나 빨간불 only라면)
    if (mode !== "blinking") {
        stopAll(); // 모든 기능 종료

        isBlinking = true; // BUTTON 2 활성화
        mode = "blinking"; // blinking으로 모드 변경
        sendSerialData("b"); // 모든 LED 깜빡이기 시작
        
        lastChange = millis(); 
        ledOn = false;
        console.log("p5 / All Led Blink ON");
    } 

    // 모든 LED가 깜빡이는 상태라면 
    else { 
        stopAll(); // 모든 기능 종료
        sendSerialData("1"); // 모든 LED 깜빡이기 중지

        // 버튼2일 때 버튼 1누르면
        if(isRedOnly) { 
            sendSerialData("r"); // 버튼1 다시 시작
            mode = "red-only"; // red-only 모드로 변경
            isRedOnly = true; // BUTTON 1 활성화
            console.log("p5 / all Led Blink OFF & Red Led only ON");
        }
        // 버튼2일 때 버튼 3누르면
        else if(isTraffic) { 
            sendSerialData("1"); // 신호등 기능 다시 시작
            mode = "normal"; // normal 모드로 변경
            isTraffic = true; // BUTTON 3 활성화
            console.log("p5 / all Led Blink OFF & Traffic ON");
        }
        // 버튼2일 때 버튼 2 다시 누르면
        else {
            currentLight = "red";     // 빨간불부터
            lastChange = millis();    // 시간을 초기화

            sendSerialData("1"); // 신호등 기능 다시 시작
            mode = "normal"; // normal 모드로 변경
            isTraffic = true; // BUTTON 3 활성화
            console.log("p5 / all Led Blink OFF");
        }
    }
}

// 모든 LED 깜빡이기 (버튼 2의 기능)
function blinkAllLEDs() {
    let now = millis();

    // 버튼2가 동작 중이면서 500ms가 지났으면
    if (isBlinking && now - lastChange >= 500) { // 500ms 간격으로 깜빡이기
        ledOn = !ledOn; // 반전
        lastChange = now; // 시간 초기화
    }
    let activeAlpha = brightness;      // 슬라이더 값 0~255
    let inactiveAlpha = brightness * 0 // 혹은 brightness * 0.3 등

    if (ledOn) {
        // 빨강
        fill(255, 0, 0, activeAlpha);
        ellipse(150, 100, 60, 60);

        // 노랑
        fill(255, 255, 0, activeAlpha);
        ellipse(250, 100, 60, 60);

        // 초록
        fill(0, 255, 0, activeAlpha);
        ellipse(350, 100, 60, 60);
    } else {
        // LED를 끌 때도 brightness(=0) 혹은 회색 표시
        fill(240, inactiveAlpha); 
        ellipse(150, 100, 60, 60);
        ellipse(250, 100, 60, 60);
        ellipse(350, 100, 60, 60);
    }
}


//------------------BUTTON 3: TRAFFIC LIGHT ON/OFF----------------------
function toggleTraffic() {

    // 신호등 기능이 꺼진 상태라면(red only거나 모든 LED 깜빡이기 중이라면)
    if (mode !== "normal") {
        stopAll(); // 모든 기능 종료

        currentLight = "red";     // 빨간불부터
        lastChange = millis();    // 시간을 초기화

        sendSerialData("1"); // 신호등 기능 시작
        mode = "normal"; // normal 모드로 변경
        isTraffic = true; // 신호등 기능 활성화
        console.log("p5 / Traffic ON");
    } 
    // 신호등 기능이 켜진 상태라면
    else {
        stopAll(); // 모든 기능 종료(p5)
        sendSerialData("0");  // 신호등 기능 중지(아두이노)
        mode = "stopped";
        console.log("p5 / Traffic OFF");
    }
}


// ---------------------------- //
//          p5.js UI            //
// ---------------------------- //

function draw() {
    background(240);
    brightness = brightnessSlider.value();
    redTime = redSlider.value();
    yellowTime = yellowSlider.value();
    greenTime = greenSlider.value();

    if (!isBlinking) {
        drawTrafficLights();
    }
    
    fill(0);
    textSize(16);

    let textX = 30, textY = 270;
    text(`밝기: ${brightness}`, textX, textY);
    textY += 50;
    text(`빨간불: ${redTime}ms`, textX, textY);
    textY += 50;
    text(`노란불: ${yellowTime}ms`, textX, textY);
    textY += 50;
    text(`초록불: ${greenTime}ms`, textX, textY);

    textSize(20);
    fill(50);
    text(`현재 모드: ${mode}`, 30, 500);
    text(`현재 신호등: ${currentLight.toUpperCase()}`, 30, 530);

    if (isTraffic) { // 🚦 신호등이 작동 중일 때만 실행
        updateTrafficLight();
    } else if (isBlinking) { // 💡 모든 LED 깜빡이기 모드일 때
        blinkAllLEDs();
    }
}

//----------------기본 신호등 기능------------------
function updateTrafficLight() {
    let now = millis();

    if (currentLight === "red" && now - lastChange >= redTime) {
        currentLight = "yellow";  // 첫 번째 노랑
        lastChange = now;
    } 
    else if (currentLight === "yellow" && now - lastChange >= yellowTime) {
        currentLight = "green";
        lastChange = now;
    } 
    else if (currentLight === "green" && now - lastChange >= greenTime) {
        currentLight = "greenBlink";
        isGreenBlink = true;
        blinkCount = 0;
        lastChange = now;
    } 
    else if (currentLight === "greenBlink" && now - lastChange >= greenBlinkInterval) {
        blinkCount++;
        lastChange = now;
        
        if (blinkCount >= 7) { // 6번 깜빡이면 종료
            currentLight = "yellow2";
            isGreenBlink = false;
            lastChange = now;
        }
        else {
            isGreenBlink = !isGreenBlink;
        }
    }
    else if (currentLight === "yellow2" && now - lastChange >= yellowTime) {
        currentLight = "red";
        lastChange = now;
    } 
}


//----------------신호등 UI 표시-------------------
function drawTrafficLights() {
    let lightX = [150, 250, 350];
    let lightColors = { 
        "red": color(255, 0, 0), 
        "yellow": color(255, 255, 0), 
        "green": color(0, 255, 0) ,
        "yellow2": color(255, 255, 0)
    };

    // 모든 기능이 꺼진 상태일 때
    if (mode === "stopped") {
        fill(240); // 회색
        for (let i = 0; i < 3; i++) {
            stroke(0);
            ellipse(lightX[i], 100, 60, 60);
        }
        return; // 함수 종료
    }
    
    // 활성화 / 비활성화 밝기를 결정
    let activeAlpha = brightness;        // 켜진 상태일 때 알파 (0~255)
    let inactiveAlpha = brightness * 0   // 꺼진 상태일 때 알파 
    

    // 빨강
    if (currentLight === "red") {
        fill(255, 0, 0, activeAlpha);
    } else {
        fill(255, 0, 0, inactiveAlpha);
    }
    ellipse(lightX[0], 100, 60, 60);

    // 노랑 or 노랑2
    if (currentLight === "yellow" || currentLight === "yellow2") {
        fill(255, 255, 0, activeAlpha);
    } else {
        fill(255, 255, 0, inactiveAlpha);
    }
    ellipse(lightX[1], 100, 60, 60);

    // 초록 (깜빡이기 중이면 켜진 상태로 볼 수도 있음)
    if (currentLight === "green" || (currentLight === "greenBlink" && isGreenBlink)) {
        fill(0, 255, 0, activeAlpha);
    } else {
        fill(0, 255, 0, inactiveAlpha);
    }
    ellipse(lightX[2], 100, 60, 60);

}