"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { setLoading } from "@/redux/loading/loadingSlice";
import { RootState } from "@/redux/store";

interface props {
  delay: number;
  color: string;
}

const SlidingDiv = ({ delay, color }: props) => {
  const dispatch = useDispatch();
  const phase = useSelector((state: RootState) => state.loading.loading);
  const [tempPhase, setTempPhase] = useState("initial");
  const [pageLoaded, setPageLoaded] = useState(false);
  const [componentMounted, setComponentMounted] = useState(false);

  // Check component mount
  useEffect(() => {
    setComponentMounted(true);
    return () => setComponentMounted(false);
  }, []);

  // Check page load
  useEffect(() => {
    const handleLoad = () => setPageLoaded(true);

    if (document.readyState === "complete") {
      setPageLoaded(true);
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => window.removeEventListener("load", handleLoad);
  }, []);

  useEffect(() => {
    if (phase !== "initial") {
      setTempPhase("initial");
      dispatch(setLoading("initial"));
    }
  }, [phase]);

  // Animation sequence starts only when both conditions are met
  useEffect(() => {
    if (tempPhase === "initial" && pageLoaded && componentMounted) {
      setTimeout(
        () => {
          setTempPhase("cover");
        },
        600 + delay * 50
      );
    }
    if (tempPhase === "cover") {
      setTimeout(() => {
        setTempPhase("exit");
      }, 1500);
    }
  }, [tempPhase, pageLoaded, componentMounted, delay]);

  return (
    <>
      {/* Import the Nosifer font */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Bungee+Inline&display=swap');
        `}
      </style>
      <div
        className={`fixed left-0 w-full h-screen bg-${color} z-[100] transition-all ease-in-out flex items-center justify-center
          ${tempPhase === "initial" ? "translate-y-full duration-0" : ""}
          ${tempPhase === "cover" ? "translate-y-0 duration-1000" : ""}
          ${tempPhase === "exit" ? "-translate-y-full duration-1000" : ""}
        `}
      >
        <div
          style={{
            fontFamily: "'Bungee Inline', cursive",
            textAlign: "center",
            fontSize: "min(15vw, 300px)",
            lineHeight: "1",
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          STREAM
        </div>
      </div>
    </>
  );
};

export default SlidingDiv;
