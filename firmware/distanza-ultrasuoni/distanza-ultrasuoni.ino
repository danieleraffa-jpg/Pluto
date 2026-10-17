// Firmware per sensore a ultrasuoni HC-SR04 (misura di distanza continua),
// alternativa al PIR HC-SR501 per il canale "radar" - da' un vero valore
// continuo (come il principio del beam Soundbeam), non solo presenza si/no.
//
// Collegamento HC-SR04:
//   VCC   -> 5V
//   GND   -> GND
//   Trig  -> pin 2 (uscita)
//   Echo  -> pin 3 (ingresso)
//
// Manda la distanza misurata in centimetri via Seriale, una riga per
// lettura (es. "23"), solo quando cambia rispetto all'ultima misura
// inviata. pluto-runtime (software/pluto-runtime/) la legge via Web
// Serial e la trasforma in una nota scelta da una scala, come i raggi
// collegati all'eobody - stesso principio "posizione -> nota".
//
// Se non rileva nessun oggetto entro la portata massima, manda "0"
// (fuori raggio = nessun suono, come l'area inattiva di un beam
// Soundbeam).

const int TRIG_PIN = 2;
const int ECHO_PIN = 3;
const unsigned long ECHO_TIMEOUT_US = 30000; // ~5m di portata massima

int lastSentCm = -1;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, ECHO_TIMEOUT_US);
  int distanceCm = duration == 0 ? 0 : (int)(duration * 0.0343 / 2);

  if (distanceCm != lastSentCm) {
    Serial.println(distanceCm);
    lastSentCm = distanceCm;
  }

  delay(60); // ~16 letture al secondo, abbastanza reattivo senza intasare la seriale
}
