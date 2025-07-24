"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../../script/firebaseConfig";
import emailjs from "@emailjs/browser";

export default function OnTrialPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [basicCount, setBasicCount] = useState(0);
  const [premiumCount, setPremiumCount] = useState(0);
  const [modalData, setModalData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "subscription"));
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSubscriptions(data);
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const updatePlanCounts = async (companyId) => {
    try {
      const userInfoSnapshot = await getDocs(
        collection(db, "subscription", companyId, "user_information")
      );

      const users = userInfoSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const basic = users.filter(
        (user) => user.plan?.toLowerCase() === "basic"
      ).length;
      const premium = users.filter(
        (user) => user.plan?.toLowerCase() === "premium"
      ).length;

      const subscriptionRef = doc(db, "subscription", companyId);
      const subscriptionSnap = await getDoc(subscriptionRef);

      if (!subscriptionSnap.exists()) {
        console.error("Subscription document not found.");
        return;
      }

      const subscriptionData = subscriptionSnap.data();
      const duration = subscriptionData.duration || 1;
      const totalAmount = (basic * 200 + premium * 360) * duration;

      await updateDoc(subscriptionRef, {
        basicUsers: basic,
        premiumUsers: premium,
        totalAmount: totalAmount,
      });

      setBasicCount(basic);
      setPremiumCount(premium);
      setModalData(users);
    } catch (error) {
      console.error("Error updating plan counts:", error);
    }
  };

  const openModal = async (companyId, name) => {
    setSelectedCompanyId(companyId);
    setCompanyName(name);
    await updatePlanCounts(companyId);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalData([]);
    setSelectedCompanyId(null);
    setCompanyName("");
  };

const sendEmail = async (sub) => {
  const totalAmount =
    (sub.basicUsers * 200 + sub.premiumUsers * 360) * sub.duration;

  const templateParams = {
    to_name: sub.contactPerson,
    to_email: sub.email,
    company_name: sub.companyName,
    basic_users: sub.basicUsers,
    premium_users: sub.premiumUsers,
    duration: sub.duration,
    total_amount: `₱${totalAmount.toLocaleString()}`,
    logo_url: "http://localhost:3000/images/ineo.png",
  };

  try {
    const result = await emailjs.send(
      "service_pacwikf",              // Your EmailJS service ID
      "template_pj34e4m",             // Your EmailJS template ID
      templateParams,
      "8nV8GppQ82RWajpEo"             // Your EmailJS public key
    );

    console.log(`Email sent to ${sub.companyName}:`, result);
    alert(`Email sent to ${sub.companyName}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    alert(`Failed to send email: ${error?.text || error?.message || 'Unknown error'}`);
  }
};



  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="py-2 px-4 border-b">Company Name</th>
                <th className="py-2 px-4 border-b">Basic</th>
                <th className="py-2 px-4 border-b">Premium</th>
                <th className="py-2 px-4 border-b">Duration</th>
                <th className="py-2 px-4 border-b">Date start</th>
                <th className="py-2 px-4 border-b">Total Amount</th>
                <th className="py-2 px-4 border-b">Due Date</th>
                <th className="py-2 px-4 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td
                    className="py-2 px-4 border-b text-blue-600 cursor-pointer "
                   
                  >
                    {sub.companyName}
                  </td>
                  <td className="py-2 px-4 border-b">{sub.basicUsers}</td>
                  <td className="py-2 px-4 border-b">{sub.premiumUsers}</td>
                  <td className="py-2 px-4 border-b">{sub.duration}</td>
                  <td className="py-2 px-4 border-b">
                    {sub.timestamp?.toDate().toLocaleString()}
                  </td>
                  <td className="py-2 px-4 border-b">{sub.totalAmount}</td>
                  <td
                    className={`py-2 px-4 border-b ${(() => {
                      const startDate = sub.timestamp?.toDate();
                      if (!startDate || !sub.duration) return "";
                      const dueDate = new Date(startDate);
                      dueDate.setMonth(
                        dueDate.getMonth() + Number(sub.duration)
                      );
                      const today = new Date();
                      const daysLeft = Math.floor(
                        (dueDate - today) / (1000 * 60 * 60 * 24)
                      );
                      return daysLeft <= 7 ? "text-red-600 font-semibold" : "";
                    })()}`}
                  >
                    {(() => {
                      const startDate = sub.timestamp?.toDate();
                      if (!startDate || !sub.duration) return "N/A";
                      const dueDate = new Date(startDate);
                      dueDate.setMonth(
                        dueDate.getMonth() + Number(sub.duration)
                      );
                      return dueDate.toLocaleDateString();
                    })()}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <button
                      onClick={() => sendEmail(sub)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Send Email
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
     
    </div>
  );
}
