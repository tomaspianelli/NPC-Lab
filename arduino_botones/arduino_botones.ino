
const int botones[] = {2, 3, 4, 5, 6, 7};

const char* nombres[] = {
  "LEFT",
  "RIGHT",
  "UP",
  "DOWN",
  "CENTER",
  "RED"
};

int estados[6];

void setup() {
  Serial.begin(9600);

  for (int i = 0; i < 6; i++) {
    pinMode(botones[i], INPUT_PULLUP);
    estados[i] = HIGH;
  }
}

void loop() {
  for (int i = 0; i < 6; i++) {
    int actual = digitalRead(botones[i]);

    if (estados[i] == HIGH && actual == LOW) {
      Serial.println(nombres[i]);
    }

    estados[i] = actual;
  }

  delay(30);
}


