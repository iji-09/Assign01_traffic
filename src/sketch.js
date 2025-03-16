let serial;  
let portName = "";  
let redTime = 2000;   
let yellowTime = 500; 
let greenTime = 2000; 
let greenBlinkTime = 1000; 
let greenBlinkInterval = 166; 
let firstYellowTime = 500; 

let brightness = 255; 
let currentLight = "red"; 
let mode = "normal"; 
let lastChange = 0;
let blinkCount = 0;
let isBlinking = false;
let lastBrightness = -1;  // 밝기 디바운스 처리

function setup() {
    createCanvas(500, 600);
    background(240);

    // 시리얼 포트 초기화
    serial = new p5.SerialPort();
    serial.on("open", onSerialOpen);
    serial.on("data", serialEvent);
    serial.on("error", serialError);

    // 연결 버튼 추가
    let connectButton = createButton("아두이노 연결");
    connectButton.position(30, 30);
    connectButton.mousePressed(connectToSerial);

    let sliderX = 30, sliderY = 280;

    // 밝기 조절 슬라이더
    brightnessSlider = createSlider(0, 255, 255);
    brightnessSlider.position(sliderX, sliderY);
    brightnessSlider.input(sendBrightness);
    
    sliderY += 50;
    redSlider = createSlider(1000, 5000, redTime);
    redSlider.position(sliderX, sliderY);
    
    sliderY += 50; 
    yellowSlider = createSlider(200, 2000, yellowTime);
    yellowSlider.position(sliderX, sliderY);
    
    sliderY += 50; 
    greenSlider = createSlider(1000, 5000, greenTime);
    greenSlider.position(sliderX, sliderY);
    
    let buttonX = 300, buttonY = 280;
    let buttonSpacing = 60; 

    let btn1 = createButton("정지/재시작");
    btn1.position(buttonX, buttonY);
    btn1.mousePressed(toggleTraffic);
    
    buttonY += buttonSpacing;
    let btn2 = createButton("리셋");
    btn2.position(buttonX, buttonY);
    btn2.mousePressed(resetTraffic);
    
    lastChange = millis();
}

function draw() {
    background(240);
    
    brightness = brightnessSlider.value();
    redTime = redSlider.value();
    yellowTime = yellowSlider.value();
    greenTime = greenSlider.value();

    drawTrafficLights();

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

    if (mode === "normal") {
        updateTrafficLight();
    }
}

function connectToSerial() {
    serial.list();
    serial.requestPort();
    serial.on("list", function(ports) {
        if (ports.length > 0) {
            portName = ports[0];
            serial.open(portName);
            console.log("포트 열기 시도: " + portName);
        } else {
            console.log("연결 가능한 포트가 없습니다.");
        }
    });

    serial.on("open", function() {
        console.log("✅ 시리얼 포트가 정상적으로 연결되었습니다!");
    });

    serial.on("error", function(err) {
        console.log("⚠️ 시리얼 연결 중 오류 발생:", err);
    });
}

function serialEvent() {
    let data = serial.readLine();
    if (data && data.trim().length > 0) {
        data = data.trim();
        console.log("📩 아두이노에서 수신됨:", data);

        if (data === "RED") currentLight = "red";
        else if (data === "YELLOW") currentLight = "yellow";
        else if (data === "GREEN") currentLight = "green";
    }
}

function sendBrightness() {
    let b = brightnessSlider.value();
    if (b !== lastBrightness) {
        serial.write("B" + b + "\n");
        lastBrightness = b;
        console.log("💡 밝기 변경: " + b);
    }
}
