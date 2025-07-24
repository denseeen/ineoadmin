"use client";

import { useEffect, useState } from "react";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { collection, getDocs,doc,deleteDoc,addDoc,updateDoc, getDoc,setDoc  } from "firebase/firestore";
import { db } from "../../../../script/firebaseConfig";

export default function TrialTable() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [duration, setDuration] = useState('');
  const [basicCount, setBasicCount] = useState(0);
const [premiumCount, setPremiumCount] = useState(0);





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

const handleDownloadExcel = async () => {
  if (userInfo.length === 0) {
    alert("No user data available to download.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Users");

  worksheet.columns = [
    { header: "Full Name", key: "fullName", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Position", key: "position", width: 20 },
    { header: "Department", key: "department", width: 20 },
    { header: "Plan", key: "plan", width: 15 },
  ];

  userInfo.forEach((user) => {
    worksheet.addRow(user);
  });

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${selectedCompany}_Users.xlsx`);
};

const openModal = async (subscriptionId, companyName) => {
  try {
    const userInfoSnapshot = await getDocs(
      collection(db, `subscription/${subscriptionId}/user_information`)
    );
    const users = userInfoSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setUserInfo(users);
    setSelectedCompany(companyName);
    setSelectedCompanyId(subscriptionId);

    // Fetch duration and user counts
    const subscriptionRef = doc(db, "subscription", subscriptionId);
    const subscriptionSnap = await getDoc(subscriptionRef);

    if (subscriptionSnap.exists()) {
      const subscriptionData = subscriptionSnap.data();
      setDuration(subscriptionData.duration || '');
      
      // If you want to show counts from DB, add:
      setBasicCount(subscriptionData.basicUsers || 0);
      setPremiumCount(subscriptionData.premiumUsers || 0);
    }

    setShowModal(true);
  } catch (error) {
    console.error("Error fetching user information:", error);
  }
};


const handleDeleteUser = async (userId) => {
  const confirmDelete = confirm("Are you sure you want to delete this user?");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "subscription", selectedCompanyId, "user_information", userId));
    setUserInfo((prevUsers) => prevUsers.filter((u) => u.id !== userId));
    await updatePlanCounts();
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("Failed to delete user.");
  }
};


const [formData, setFormData] = useState({
  fullName: "",
  email: "",
  position: "",
  department: "",
  plan: "",
  duration:"",
});
const [isEditing, setIsEditing] = useState(false);
const [editUserId, setEditUserId] = useState(null);
const [showForm, setShowForm] = useState(false);

const openModalWithCompany = (companyId) => {
  setSelectedCompanyId(companyId);
  setShowModal(true);
};

const handleAddUser = () => {
  setFormData({
    fullName: "",
    email: "",
    position: "",
    department: "",
    plan: "",
  });
  setIsEditing(false);
  setShowForm(true);
};

const handleEditUser = (user) => {
  setFormData(user);
  setEditUserId(user.id);
  setIsEditing(true);
  setShowForm(true);
};

const handleRemoveUser = async (user) => {
  const confirmed = confirm(`Are you sure you want to delete ${user.fullName}?`);
  if (!confirmed) return;

  try {
    const userDocRef = doc(db, "subscription", selectedCompanyId, "user_information", user.id);
    await deleteDoc(userDocRef);
    setUserInfo(userInfo.filter((u) => u.id !== user.id));
    await updatePlanCounts(); // ✅ Update Firestore after deletion
  } catch (error) {
    console.error("Error deleting user:", error);
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!selectedCompanyId) {
    console.error("selectedCompanyId is not set");
    return;
  }

  const userInfoRef = collection(db, "subscription", selectedCompanyId, "user_information");

  try {
    if (isEditing) {
      const userDocRef = doc(db, "subscription", selectedCompanyId, "user_information", editUserId);
      await updateDoc(userDocRef, formData);
      setUserInfo((prev) =>
        prev.map((u) => (u.id === editUserId ? { ...formData, id: editUserId } : u))
      );
    } else {
      const docRef = await addDoc(userInfoRef, formData);
      setUserInfo((prev) => [...prev, { ...formData, id: docRef.id }]);
    }

    setShowForm(false);
    await updatePlanCounts(); // ✅ Update Firestore after add/edit
  } catch (error) {
    console.error("Error saving user:", error);
  }
};

const handleSelectCompany = (company) => {
  setSelectedCompany(company.name);
  setSelectedCompanyId(company.id);
  setShowModal(true);
};

const handleSaveNewUser = async () => {
  if (
    !formData.fullName.trim() ||
    !formData.email.trim() ||
    !formData.position.trim() ||
    !formData.department.trim() ||
    !formData.plan
  ) {
    alert("Please fill out all fields.");
    return;
  }

  const newUser = {
    id: Date.now().toString(), // Or use uuid() if available
    fullName: formData.fullName,
    email: formData.email,
    position: formData.position,
    department: formData.department,
    plan: formData.plan,
  };

  try {
    const userRef = doc(db, "subscription", selectedCompanyId, "user_information", newUser.id);
    await setDoc(userRef, newUser);

    setUserInfo((prevUsers) => [...prevUsers, newUser]);
    setFormData({
      fullName: "",
      email: "",
      position: "",
      department: "",
      plan: "",
    });
    setShowForm(false);
    await updatePlanCounts();
  } catch (error) {
    console.error("Error adding user:", error);
    alert("Failed to add user.");
  }
};


// ✅ This function updates Firestore with latest counts
const updatePlanCounts = async () => {
  if (!selectedCompanyId) return;

  try {
    // Get fresh user list directly from Firestore
    const userInfoSnapshot = await getDocs(
      collection(db, "subscription", selectedCompanyId, "user_information")
    );

    const users = userInfoSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Count users based on plans
    const basic = users.filter(user => user.plan?.toLowerCase() === "basic").length;
    const premium = users.filter(user => user.plan?.toLowerCase() === "premium").length;

    // Fetch duration
    const subscriptionRef = doc(db, "subscription", selectedCompanyId);
    const subscriptionSnap = await getDoc(subscriptionRef);

    if (!subscriptionSnap.exists()) {
      console.error("Subscription document not found.");
      return;
    }

    const subscriptionData = subscriptionSnap.data();
    const duration = subscriptionData.duration || 1;

    const totalAmount = (basic * 200 + premium * 360) * duration;

    // Update subscription with new values
    await updateDoc(subscriptionRef, {
      basicUsers: basic,
      premiumUsers: premium,
      totalAmount: totalAmount,
    });

    // Optionally update local state (UI display)
    setBasicCount(basic);
    setPremiumCount(premium);

    console.log("Plan counts and total amount updated:", {
      basic,
      premium,
      duration,
      totalAmount,
    });
  } catch (error) {
    console.error("Error updating plan counts:", error);
  }
};




const handleSaveDuration = async () => {
  if (!selectedCompanyId) return;
  const durationValue = parseInt(duration);

  if (isNaN(durationValue) || durationValue < 1) {
    alert("Please enter a valid duration.");
    return;
  }

  try {
    const subscriptionRef = doc(db, "subscription", selectedCompanyId);
    await updateDoc(subscriptionRef, {
      duration: durationValue,
    });

    // Optionally re-trigger updatePlanCounts if needed
    await updatePlanCounts();

    // alert("Duration updated successfully.");
  } catch (error) {
    console.error("Error updating duration:", error);
  }
};



  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Subscription</h1>

            {loading ? (
              <p>Loading...</p>
            ) : subscriptions.length === 0 ? (
              <p>No subscription records found.</p>
            ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="py-2 px-4 border-b">Company Name</th>
                <th className="py-2 px-4 border-b">Contact Person</th>
                <th className="py-2 px-4 border-b">Email</th>
                <th className="py-2 px-4 border-b">Phone</th>
                <th className="py-2 px-4 border-b">Basic</th>
                <th className="py-2 px-4 border-b">Premium</th>
                <th className="py-2 px-4 border-b">Duration</th>
                <th className="py-2 px-4 border-b">Total Amount</th>

              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td
                    className="py-2 px-4 border-b text-blue-600 cursor-pointer underline"
                    onClick={() => openModal(sub.id, sub.companyName)}
                  >
                    {sub.companyName}
                  </td>
                  <td className="py-2 px-4 border-b">{sub.contactPerson}</td>
                  <td className="py-2 px-4 border-b">{sub.email}</td>
                  <td className="py-2 px-4 border-b">{sub.phone}</td>
                  <td className="py-2 px-4 border-b">{sub.basicUsers}</td>
                  <td className="py-2 px-4 border-b">{sub.premiumUsers}</td>
                  <td className="py-2 px-4 border-b">{sub.duration}</td>
                  <td className="py-2 px-4 border-b">{sub.totalAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
{showModal && (
  <div className="fixed inset-0 bg-blue-500/40 flex items-center justify-center z-50 overflow-y-auto pt-20">
    <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full p-6 relative">
      <h2 className="text-xl font-semibold mb-4">Editing: {selectedCompany}</h2>

      <div className="text-sm font-medium text-gray-700 mb-2">
        Basic: <span className="font-bold">{basicCount}</span> | Premium: <span className="font-bold">{premiumCount}</span>
      </div>

      <button
        className="absolute top-3 right-4 text-gray-600 hover:text-black text-lg"
        onClick={() => setShowModal(false)}
      >
        &times;
      </button>

      <div className="flex justify-end mb-4">
        <button
          onClick={handleAddUser}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          + Add User
        </button>
        <button
          onClick={handleDownloadExcel}
          className="bg-blue-500 text-white px-4 py-2 rounded ml-1.5 hover:bg-blue-600"
        >
          ⬇️
        </button>
      </div>

      {/* Add User Form */}
      {showForm && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          <input
            className="border px-3 py-2 rounded"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          />
          <input
            className="border px-3 py-2 rounded"
            placeholder="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <input
            className="border px-3 py-2 rounded"
            placeholder="Position"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          />
          <input
            className="border px-3 py-2 rounded"
            placeholder="Department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
          <select
            className="border px-3 py-2 rounded col-span-2"
            value={formData.plan}
            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
          >
            <option value="">Select Plan</option>
            <option value="Basic">Basic</option>
            <option value="Premium">Premium</option>
          </select>
          <div className="col-span-2 flex justify-end gap-2">
            <button
              onClick={handleSaveNewUser}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({
                  fullName: "",
                  email: "",
                  position: "",
                  department: "",
                  plan: "",
                });
              }}
              className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Editable Duration */}
      <div className="mb-4">
        <label className="block font-medium text-gray-700">Duration (months):</label>
        <input
          type="number"
          className="border px-3 py-1 rounded w-32"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          disabled={!isEditing}
        />
      </div>

      {/* User Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">Full Name</th>
              <th className="py-2 px-4 border">Email</th>
              <th className="py-2 px-4 border">Position</th>
              <th className="py-2 px-4 border">Department</th>
              <th className="py-2 px-4 border">Plan</th>
              <th className="py-2 px-4 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {userInfo.map((user, index) => (
              <tr key={user.id}>
                <td className="py-1 px-2 border">
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full"
                    value={user.fullName}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const updatedUsers = [...userInfo];
                      updatedUsers[index].fullName = e.target.value;
                      setUserInfo(updatedUsers);
                    }}
                  />
                </td>
                <td className="py-1 px-2 border">
                  <input
                    type="email"
                    className="border rounded px-2 py-1 w-full"
                    value={user.email}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const updatedUsers = [...userInfo];
                      updatedUsers[index].email = e.target.value;
                      setUserInfo(updatedUsers);
                    }}
                  />
                </td>
                <td className="py-1 px-2 border">
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full"
                    value={user.position}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const updatedUsers = [...userInfo];
                      updatedUsers[index].position = e.target.value;
                      setUserInfo(updatedUsers);
                    }}
                  />
                </td>
                <td className="py-1 px-2 border">
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full"
                    value={user.department}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const updatedUsers = [...userInfo];
                      updatedUsers[index].department = e.target.value;
                      setUserInfo(updatedUsers);
                    }}
                  />
                </td>
                <td className="py-1 px-2 border">
                  <select
                    className="border rounded px-2 py-1 w-full"
                    value={user.plan}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const updatedUsers = [...userInfo];
                      updatedUsers[index].plan = e.target.value;
                      setUserInfo(updatedUsers);
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Basic">Basic</option>
                    <option value="Premium">Premium</option>
                  </select>
                </td>
                <td className="py-1 px-2 border text-center">
                  {isEditing && (
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex justify-end gap-4">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Edit All
          </button>
        ) : (
          <>
            <button
              onClick={async () => {
                for (const user of userInfo) {
                  const userRef = doc(db, "subscription", selectedCompanyId, "user_information", user.id);
                  await updateDoc(userRef, {
                    fullName: user.fullName,
                    email: user.email,
                    position: user.position,
                    department: user.department,
                    plan: user.plan,
                  });
                }

                const durationValue = parseInt(duration);
                if (!isNaN(durationValue)) {
                  const subscriptionRef = doc(db, "subscription", selectedCompanyId);
                  await updateDoc(subscriptionRef, { duration: durationValue });
                }

                await updatePlanCounts();
                setIsEditing(false);
                alert("Changes saved!");
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                openModal(selectedCompanyId, selectedCompany);
              }}
              className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  </div>
)}



    </div>
  );
}
