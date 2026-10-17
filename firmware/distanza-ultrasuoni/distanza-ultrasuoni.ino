// Firmware per la Arduino Mega: sensore a ultrasuoni HC-SR04 (distanza
// continua, canale "radar") + uno switch semplice (canale "tavoletta
// seriale") sulla stessa connessione USB.
//
// Collegamento HC-SR04:
//   VCC   -> 5V
//   GND   -> GND
//   Trig  -> pin 2 (uscita)
//   Echo  -> pin 3 (ingresso)
//
// Collegamento switch (es. mini switch a 4 piedini su breadboard):
//   un piedino -> pin 4
//   il piedino opposto -> GND
//   (bastano questi 2 fili: il pull-up e' interno al microcontrollore,
//   attivato con INPUT_PULLUP - nessuna resistenza esterna necessaria.
//   Per questo lo stesso problema del pull-up sull'eobody qui non esiste.)
//
// Protocollo seriale: ogni riga ha un prefisso per distinguere i due
// sensori, cosi' pluto-runtime sa a quale canale indirizzarla:
//   "D:<cm>"  distanza in centimetri (manda solo quando cambia)
//   "S:1"     switch premuto
//   "S:0"     switch rilasciato

const int TRIG_PIN = 2;
const int ECHO_PIN = 3;
const int SWITCH_PIN = 4;
const unsigned long ECHO_TIMEOUT_US = 30000; // ~5m di portata massima
const unsigned long SWITCH_DEBOUNCE_MS = 30;

int lastSentCm = -1;
int lastSwitchState = HIGH; // HIGH a riposo grazie al pull-up interno
unsigned long lastSwitchChangeMs = 0;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(SWITCH_PIN, INPUT_PULLUP);
}

void loop() {
  readDistance();
  readSwitch();
  delay(20);
}

void readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, ECHO_TIMEOUT_US);
  int distanceCm = duration == 0 ? 0 : (int)(duration * 0.0343 / 2);

  if (distanceCm != lastSentCm) {
    Serial.print("D:");
    Serial.println(distanceCm);
    lastSentCm = distanceCm;
  }
}

void readSwitch() {
  int state = digitalRead(SWITCH_PIN);
  if (state != lastSwitchState && (millis() - lastSwitchChangeMs) > SWITCH_DEBOUNCE_MS) {
    // col pull-up interno, LOW = premuto (collegato a massa), HIGH = a riposo
    Serial.println(state == LOW ? "S:1" : "S:0");
    lastSwitchState = state;
    lastSwitchChangeMs = millis();
  }
}
