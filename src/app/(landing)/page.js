"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "../../../script/firebaseConfig"; // Firebase config
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    // userName: "",
    fullName: "",
    email: "",
  });

  const [error, setError] = useState(null);
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "password") {
      setPassword(value);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);

  try {
    if (isSignUp) {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "admin", user.uid), {
        fullName: formData.fullName,
        email: formData.email,
      });

      alert("Account created successfully!");
    } else {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        password
      );
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "admin", user.uid));
      if (!userDoc.exists()) {
        alert("You are not authorized to log in.");
        return;
      }

      localStorage.setItem("adminId", user.uid);
      alert("Logged in successfully!");
      router.push("/main");
    }
  } catch (err) {
    console.error("Auth error:", err);
    setError(err.message);
  }
};
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white overflow-hidden pt-0">
      <div className="relative w-[600px] h-[400px] bg-white rounded-lg overflow-hidden shadow-xl flex">
        {/* Form Section */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: isSignUp ? "60%" : "0%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute w-[62%] h-full flex items-center justify-center bg-white p-6"
        >
          <motion.div
            key={isSignUp ? "sign-up" : "sign-in"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full flex flex-col items-center justify-center"
          >
            {isSignUp ? (
              <SignUpForm
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                error={error}
                password={password}
              />
            ) : (
              <SignInForm
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                error={error}
                password={password}
              />
            )}
          </motion.div>
        </motion.div>

        {/* Toggle Button Section */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: isSignUp ? "0%" : "171%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute w-[37%] h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-white p-6"
        >
          <p className="mt-4 text-lg text-gray-700 pb-2.5">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg shadow-md hover:bg-gray-600 transition-all"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

function SignInForm({ formData, handleChange, handleSubmit, error, password }) {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-4">Sign In</h2>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col items-center">
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email Address"
          className="mb-3 p-2 border rounded w-56"
          required
        />
        <input
          type="password"
          name="password"
          value={password}
          onChange={handleChange}
          placeholder="Password"
          className="mb-3 p-2 border rounded w-56"
          required
        />

        <button
          type="submit"
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}

function SignUpForm({ formData, handleChange, handleSubmit, error, password }) {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-4">Sign Up</h2>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col items-center">
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Full Name"
          className="mb-3 p-2 border rounded w-56"
          required
        />

        {/* <input
          type="text"
          name="userName"
          value={formData.userName}
          onChange={handleChange}
          placeholder="Username"
          className="mb-3 p-2 border rounded w-56"
          required
        /> */}
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email Address"
          className="mb-3 p-2 border rounded w-56"
          required
        />
        <input
          type="password"
          name="password"
          value={password}
          onChange={handleChange}
          placeholder="Password"
          className="mb-3 p-2 border rounded w-56"
          required
        />
        <button
          type="submit"
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}
