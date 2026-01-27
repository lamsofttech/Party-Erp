import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import DCPLogo from "../assets/DCP_logo-1.png";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

import { Lock, Delete, X } from "lucide-react";

/** Brand palette */
const JUBILEE_RED = "#F5333F";
const JUBILEE_DARK = "#111827";
const JUBILEE_MUTED = "#FEECEE";
const JUBILEE_BORDER = "#F5333F";

const MAX_ATTEMPTS = 3;
const ATTEMPTS_KEY = "jubilee_login_attempts";
const LOCKED_KEY = "jubilee_login_locked";
const PIN_LEN = 6;

// Using DIGITS for keypad (prevents TS6133 unused var errors)
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

export default function PinLoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(MAX_ATTEMPTS);
  const [locked, setLocked] = useState<boolean>(false);

  const navigate = useNavigate();
  const { login } = useUser();

  const submitInFlightRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load attempts + locked state from localStorage (safe parse)
  useEffect(() => {
    const storedAttempts = localStorage.getItem(ATTEMPTS_KEY);
    const storedLocked = localStorage.getItem(LOCKED_KEY);

    if (storedAttempts != null) {
      const n = Number(storedAttempts);
      if (Number.isFinite(n) && n >= 0 && n <= MAX_ATTEMPTS) {
        setAttemptsLeft(n);
      }
    }

    if (storedLocked === "1") {
      setLocked(true);
      setError(
        "Your access is locked after 3 failed attempts. Please contact your Jubilee System Administrator."
      );
    }

    // Focus after initial paint
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const canInteract = !locked && !loading;
  const showAttempts = !locked && attemptsLeft < MAX_ATTEMPTS;

  const resetLocksOnSuccess = useCallback(() => {
    localStorage.removeItem(ATTEMPTS_KEY);
    localStorage.removeItem(LOCKED_KEY);
    setAttemptsLeft(MAX_ATTEMPTS);
    setLocked(false);
    setPin("");
    setError(null);
  }, []);

  const handleFailedAttempt = useCallback(() => {
    setPin("");

    setAttemptsLeft((prev) => {
      const next = prev - 1;
      const safeNext = Math.max(0, next);
      localStorage.setItem(ATTEMPTS_KEY, String(safeNext));

      if (safeNext <= 0) {
        setLocked(true);
        localStorage.setItem(LOCKED_KEY, "1");
        setError(
          "Your access has been locked after 3 failed attempts. Please contact your Jubilee System Administrator."
        );
      } else {
        const attemptWord = safeNext === 1 ? "attempt" : "attempts";
        setError(`Incorrect PIN. ${safeNext} ${attemptWord} remaining.`);
      }

      return safeNext;
    });
  }, []);

  const handlePinInput = useCallback(
    (digit: string) => {
      if (!canInteract) return;
      if (pin.length >= PIN_LEN) return;

      setPin((prev) => (prev + digit).slice(0, PIN_LEN));

      if (error) setError(null);
      inputRef.current?.focus();
    },
    [canInteract, pin.length, error]
  );

  const handleDelete = useCallback(() => {
    if (!canInteract) return;
    setPin((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  }, [canInteract]);

  const handleClear = useCallback(() => {
    if (!canInteract) return;
    setPin("");
    if (error) setError(null);
    inputRef.current?.focus();
  }, [canInteract, error]);

  const submit = useCallback(async () => {
    if (locked) {
      setError(
        "Your access is locked. Please contact your Jubilee System Administrator."
      );
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      setError("PIN must be 6 digits.");
      return;
    }

    // Prevent double submit (fast taps / StrictMode / effects)
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;

    setLoading(true);
    setError(null);

    try {
      const ok = await login(pin);

      if (!ok) {
        setLoading(false);
        submitInFlightRef.current = false;
        handleFailedAttempt();
        return;
      }

      setLoading(false);
      submitInFlightRef.current = false;

      resetLocksOnSuccess();
      navigate("/");
    } catch (err: any) {
      setLoading(false);
      submitInFlightRef.current = false;

      if (err?.message === "Invalid PIN") {
        handleFailedAttempt();
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }
    }
  }, [pin, locked, login, navigate, handleFailedAttempt, resetLocksOnSuccess]);

  // ✅ AUTO-SUBMIT REMOVED
  // It was causing repeated POST requests (effects can run more than once in dev).
  // Users will submit only by clicking the Login button.

  // Hidden input handler (mobile numeric keyboard + paste support)
  const onHiddenInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!canInteract) return;

      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, PIN_LEN);
      setPin(digitsOnly);
      if (error) setError(null);
    },
    [canInteract, error]
  );

  const dots = useMemo(() => Array.from({ length: PIN_LEN }, (_, i) => i), []);
  const keypadDigits = useMemo(() => DIGITS, []);

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: JUBILEE_RED }}
    >
      <div className="w-full max-w-md">
        <header className="flex flex-col items-center text-center text-white mb-5">
          <div className="bg-white rounded-full p-2 shadow-xl mb-2">
            <img
              src={DCPLogo}
              className="h-12 w-12 object-contain rounded-full"
              alt="Jubilee logo"
              loading="lazy"
              decoding="async"
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            SkizaGroundSuite
          </h1>
          <p className="text-white/85 text-xs sm:text-sm">
            National Election &amp; Party ERP · Authorized Officers Only
          </p>
        </header>

        <Card
          className="border-white/20 bg-white shadow-2xl rounded-2xl overflow-hidden"
          onClick={() => inputRef.current?.focus()}
        >
          <CardHeader className="pb-3">
            <div className="flex flex-col items-center gap-2">
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: JUBILEE_MUTED }}
              >
                <Lock className="h-6 w-6" style={{ color: JUBILEE_RED }} />
              </div>

              <CardTitle className="text-center text-gray-900 text-xl">
                Enter your PIN
              </CardTitle>

              <CardDescription className="text-center text-sm text-gray-600">
                Your account will lock after 3 failed attempts.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Label className="text-[0.7rem] uppercase tracking-wide text-gray-500">
                PIN
              </Label>

              {/* Hidden input: enables mobile numeric keyboard + paste */}
              <input
                ref={inputRef}
                value={pin}
                onChange={onHiddenInputChange}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d*"
                className="sr-only"
                aria-label="PIN input"
              />

              <div
                className="w-full flex justify-center items-center h-12 px-3 rounded-2xl border select-none"
                style={{
                  backgroundColor: JUBILEE_MUTED,
                  borderColor: JUBILEE_BORDER,
                }}
                aria-live="polite"
              >
                {dots.map((i) => {
                  const filled = i < pin.length;
                  return (
                    <span
                      key={i}
                      className={[
                        "inline-block w-3.5 h-3.5 rounded-full mx-1 transition-transform",
                        filled ? "scale-100" : "scale-95",
                      ].join(" ")}
                      style={{
                        backgroundColor: filled ? JUBILEE_DARK : "#FFFFFF",
                        border: filled ? "none" : `1px solid ${JUBILEE_BORDER}`,
                      }}
                    />
                  );
                })}
              </div>

              <div className="w-full" aria-live="polite">
                {locked ? (
                  <div className="flex justify-center">
                    <Badge
                      variant="destructive"
                      className="uppercase text-[0.65rem]"
                    >
                      Access Locked
                    </Badge>
                  </div>
                ) : showAttempts ? (
                  <div className="flex justify-center">
                    <Badge
                      variant="outline"
                      className="uppercase text-[0.65rem]"
                      style={{ borderColor: JUBILEE_RED, color: JUBILEE_RED }}
                    >
                      {attemptsLeft}{" "}
                      {attemptsLeft === 1 ? "attempt" : "attempts"} remaining
                    </Badge>
                  </div>
                ) : null}

                {error && (
                  <div
                    className="mt-2 px-3 py-2 rounded-xl text-sm border text-center"
                    style={{
                      backgroundColor: JUBILEE_MUTED,
                      borderColor: JUBILEE_RED,
                      color: JUBILEE_RED,
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {/* 1..9 */}
              {keypadDigits
                .filter((d) => d !== "0")
                .map((d) => (
                  <Button
                    key={d}
                    type="button"
                    aria-label={`Digit ${d}`}
                    onClick={() => handlePinInput(d)}
                    disabled={!canInteract}
                    className="h-14 rounded-2xl text-xl font-semibold bg-white text-gray-900 border shadow-sm hover:bg-red-50 disabled:opacity-60 touch-manipulation"
                    style={{ borderColor: JUBILEE_BORDER }}
                  >
                    {d}
                  </Button>
                ))}

              {/* Delete */}
              <Button
                type="button"
                aria-label="Delete last digit"
                onClick={handleDelete}
                disabled={!canInteract || pin.length === 0}
                className="h-14 rounded-2xl bg-white text-gray-900 border shadow-sm hover:bg-red-50 disabled:opacity-50 touch-manipulation"
                style={{ borderColor: JUBILEE_BORDER }}
              >
                <Delete className="h-5 w-5" />
              </Button>

              {/* 0 */}
              <Button
                type="button"
                aria-label="Digit 0"
                onClick={() => handlePinInput("0")}
                disabled={!canInteract}
                className="h-14 rounded-2xl text-xl font-semibold bg-white text-gray-900 border shadow-sm hover:bg-red-50 disabled:opacity-60 touch-manipulation"
                style={{ borderColor: JUBILEE_BORDER }}
              >
                0
              </Button>

              {/* Clear */}
              <Button
                type="button"
                aria-label="Clear PIN"
                onClick={handleClear}
                disabled={!canInteract || pin.length === 0}
                className="h-14 rounded-2xl bg-white text-gray-900 border shadow-sm hover:bg-red-50 disabled:opacity-50 touch-manipulation"
                style={{ borderColor: JUBILEE_BORDER }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              onClick={submit}
              disabled={locked || loading || pin.length !== PIN_LEN}
              className="w-full h-12 rounded-2xl font-semibold disabled:cursor-not-allowed touch-manipulation"
              style={{
                backgroundColor:
                  locked || pin.length !== PIN_LEN || loading
                    ? "#D1D5DB"
                    : JUBILEE_DARK,
                color: "#FFFFFF",
              }}
            >
              {loading ? "Verifying..." : locked ? "Locked" : "Login"}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Forgot PIN?{" "}
              <button
                onClick={() =>
                  alert("Contact your Jubilee System Administrator.")
                }
                className="font-semibold hover:underline touch-manipulation"
                style={{ color: JUBILEE_RED }}
                type="button"
              >
                Contact system admin
              </button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
