// Firmware minimo per un sensore di presenza PIR (es. HC-SR501) collegato
// a un Arduino qualsiasi (Uno R4 WiFi, Uno R3, o altro con pin digitali
// e Seriale USB — non serve supporto MIDI nativo).
//
// Collegamento HC-SR501:
//   VCC  -> 5V
//   GND  -> GND
//   OUT  -> pin digitale 2 (fila 0-13, separata dalla fila lunga 22-53
//           sulla Arduino Mega 2560)
//
// Funzionamento: manda "1" via seriale quando rileva presenza, "0" quando
// cessa — un messaggio solo al cambio di stato, non in continuo.
// pluto-runtime (software/pluto-runtime/) legge questi messaggi via Web
// Serial e li tratta come un interruttore sostenuto (suono acceso finche'
// c'e' presenza, spento quando se ne va).
//
// La sensibilita'/distanza di rilevamento si regola col trimmer fisico
// sulla scheda HC-SR501, non da qui.

const int PIR_PIN = 2;
const unsigned long DEBOUNCE_MS = 50; // ignora cambi di stato troppo ravvicinati

int lastState = LOW;
unsigned long lastChangeMs = 0;

void setup() {
  Serial.begin(9600);
  pinMode(PIR_PIN, INPUT);
}

void loop() {
  int state = digitalRead(PIR_PIN);

  if (state != lastState && (millis() - lastChangeMs) > DEBOUNCE_MS) {
    Serial.println(state == HIGH ? "1" : "0");
    lastState = state;
    lastChangeMs = millis();
  }
}
