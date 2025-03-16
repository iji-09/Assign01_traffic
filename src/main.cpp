#include <Arduino.h>
#include <TaskScheduler.h>
#include <PinChangeInterrupt.h>

// 기본 신호등 기능에서 각 LED의 점등시간
const int RED_Light = 2000;                  
const int YELLOW_Light = 500;                
const int GREEN_Light  = 2000;               
const int GREEN_BLINK = 1000;                
const int GREEN_BLINK_INTERVAL = 166;        

// 각 버튼과 연결할 핀 설정
const int BUTTON_1 = 4; 
const int BUTTON_2 = 5;
const int BUTTON_3 = 6;
const int POTENTIOMETER_PIN = A0;  

// 시리얼 입력을 받을 버퍼
char serialCommand;

void button1Interrupt();
void button2Interrupt();
void button3Interrupt();
void stopAllFunctions();
void Restart_Traffic();
void adjustBrightness();
void processSerialInput(); // 시리얼 입력 처리 함수 추가

bool redOE(); 
void redOD();
bool yellow1OE(); 
void yellow1OD();
bool greenOE(); 
void greenOD();
bool greenBlinkOE(); 
void greenBlinkCB(); 
void greenBlinkOD();
bool yellow2OE(); 
void yellow2OD();
void allLEDBlinkCB(); 
void allLEDBlinkOD();

Scheduler ts;

// Task 객체 생성
Task red(RED_Light, TASK_ONCE, NULL, &ts, false, redOE, redOD); 
Task yellow1(YELLOW_Light, TASK_ONCE, NULL, &ts, false, yellow1OE, yellow1OD);
Task green(GREEN_Light, TASK_ONCE, NULL, &ts, false, greenOE, greenOD);
Task greenBlink(GREEN_BLINK_INTERVAL, GREEN_BLINK / GREEN_BLINK_INTERVAL, greenBlinkCB, &ts, false, greenBlinkOE, greenBlinkOD);
Task yellow2(YELLOW_Light, TASK_ONCE, NULL, &ts, false, yellow2OE, yellow2OD);

Task B2_allblink(500, TASK_FOREVER, allLEDBlinkCB, &ts, false, NULL, allLEDBlinkOD);

bool Traffic_State = true;
bool B1_State = false;
bool B2_State = false;
bool B3_State = true;  

void startTraffic() {  // 정의 추가
  Serial.println("신호등 기능 시작!");
}

void setup() {
  Serial.begin(9600); // 시리얼 통신 시작
  Serial.println("아두이노 신호등 시스템 시작...");

  pinMode(9, OUTPUT);
  pinMode(10, OUTPUT);
  pinMode(11, OUTPUT);
  pinMode(BUTTON_1, INPUT_PULLUP);
  pinMode(BUTTON_2, INPUT_PULLUP);
  pinMode(BUTTON_3, INPUT_PULLUP);

  attachPinChangeInterrupt(digitalPinToPinChangeInterrupt(BUTTON_1), button1Interrupt, FALLING);
  attachPinChangeInterrupt(digitalPinToPinChangeInterrupt(BUTTON_2), button2Interrupt, FALLING);
  attachPinChangeInterrupt(digitalPinToPinChangeInterrupt(BUTTON_3), button3Interrupt, FALLING);

  red.restartDelayed();
}

void loop() {
  ts.execute();
  adjustBrightness();
  processSerialInput(); // 시리얼 입력 처리
}

// 시리얼 입력 처리 함수
void processSerialInput() {
  if (Serial.available() > 0) {
    serialCommand = Serial.read();
    
    switch (serialCommand) {
      case '1': // 신호등 ON
        Serial.println("신호등 기능 시작");
        Restart_Traffic();
        break;
      case '0': // 신호등 OFF
        Serial.println("신호등 기능 중지");
        stopAllFunctions();
        break;
      case 'r': // 빨간불 켜기
        Serial.println("빨간불 켜기");
        stopAllFunctions();
        digitalWrite(9, HIGH);
        break;
      case 'b': // 모든 LED 깜빡이기
        Serial.println("모든 LED 깜빡이기");
        stopAllFunctions();
        B2_allblink.restartDelayed();
        break;
      default:
        Serial.println("잘못된 명령");
        break;
    }
  }
}

// 모든 기능 중지
void stopAllFunctions() {
  red.abort(); 
  yellow1.abort(); 
  green.abort(); 
  greenBlink.abort(); 
  yellow2.abort(); 
  B2_allblink.abort();

  digitalWrite(9, LOW); 
  digitalWrite(10, LOW); 
  digitalWrite(11, LOW);
  Serial.println("모든 LED OFF");
}

// 신호등 기능 재시작
void Restart_Traffic() {
  Traffic_State = true;
  red.restartDelayed();
  Serial.println("신호등 기능 재시작");
}

// 가변저항을 통한 밝기 조절
void adjustBrightness() {
  int Pin_Value = analogRead(POTENTIOMETER_PIN);
  int Brightness = map(Pin_Value, 0, 1023, 0, 255);

  analogWrite(9, digitalRead(9) * Brightness);
  analogWrite(10, digitalRead(10) * Brightness);
  analogWrite(11, digitalRead(11) * Brightness);
}

// 버튼 인터럽트 함수 정의
void button1Interrupt() {
  stopAllFunctions();
  B1_State = !B1_State;

  if (B1_State) {
    Serial.println("버튼 1: 빨간불 켜기");
    Traffic_State = false;
    digitalWrite(9, HIGH);
  } else {
    Restart_Traffic();
  }
}

void button2Interrupt() {
  stopAllFunctions();
  B2_State = !B2_State;

  if (B2_State) {
    Serial.println("버튼 2: 모든 LED 깜빡이기");
    B2_allblink.restartDelayed();
  } else {
    Restart_Traffic();
  }
}

void button3Interrupt() {
  stopAllFunctions();
  B3_State = !B3_State;

  if (B3_State) {
    Serial.println("버튼 3: 신호등 기능 재시작");
    Restart_Traffic();
  }
}


bool redOE() { 
  if (!Traffic_State) return false; // 신호등 기능이 중지된 경우 false 반환
  digitalWrite(9, HIGH); // 빨간불 켜기
  return true; 
}

void redOD() { 
  if (!Traffic_State) return; // 신호등 기능이 중지된 경우 함수 종료
  digitalWrite(9, LOW); // 빨간불 끄기
  yellow1.restartDelayed(); // 노란불 타이머 재시작
}

bool yellow1OE() { 
  if (!Traffic_State) return false; // 신호등 기능이 중지된 경우 false 반환
  digitalWrite(10, HIGH); // 노란불 켜기
  return true; 
}

void yellow1OD() { 
  if (!Traffic_State) return; // 신호등 기능이 중지된 경우 함수 종료
  digitalWrite(10, LOW); // 노란불 끄기
  green.restartDelayed(); // 초록불 타이머 재시작
}

bool greenOE() { 
  if (!Traffic_State) return false; // 신호등 기능이 중지된 경우 false 반환
  digitalWrite(11, HIGH); // 초록불 켜기
  return true; 
}

void greenOD() { 
  if (!Traffic_State) return; // 신호등 기능이 중지된 경우 함수 종료
  digitalWrite(11, LOW); // 초록불 끄기
  greenBlink.restartDelayed(); // 초록불 깜빡임 타이머 재시작
}

bool greenBlinkOE() { 
  if (!Traffic_State) return false; // 신호등 기능이 중지된 경우 false 반환
  digitalWrite(11, LOW); // 초록불 끄기
  return true; 
}

void greenBlinkCB() { 
  if (!Traffic_State) return; // 신호등 기능이 중지된 경우 함수 종료
  digitalWrite(11, !digitalRead(11)); // 초록불 상태 반전
}

void greenBlinkOD() { 
  if (!Traffic_State) return; // 신호등 기능이 중지된 경우 함수 종료
  digitalWrite(11, LOW); // 초록불 끄기
  yellow2.restartDelayed(); // 노란불 타이머 재시작
}

bool yellow2OE() { 
  if (!Traffic_State) return false; // 신호등 기능이 중지된 경우 false 반환
  digitalWrite(10, HIGH); // 노란불 켜기
  return true; 
}

void yellow2OD() { 
  if (!Traffic_State) return; // 신호등 기능이 중지된 경우 함수 종료
  digitalWrite(10, LOW); // 노란불 끄기
  red.restartDelayed(); // 빨간불 타이머 재시작
}

void allLEDBlinkCB() {
  if (!Traffic_State) return; // 신호등 기능이 중지된 경우 함수 종료
  bool state = digitalRead(9);  // 9번 핀의 LED 상태를 읽음
  state = !state;  // 상태 반전
  
  digitalWrite(9, state);  // 9번 핀의 LED 상태를 반전된 상태로 설정
  digitalWrite(10, state);  // 10번 핀의 LED 상태를 반전된 상태로 설정
  digitalWrite(11, state);  // 11번 핀의 LED 상태를 반전된 상태로 설정
}

void allLEDBlinkOD() {
  digitalWrite(9, LOW); // 9번 핀의 LED 끄기
  digitalWrite(10, LOW); // 10번 핀의 LED 끄기
  digitalWrite(11, LOW); // 11번 핀의 LED 끄기
}