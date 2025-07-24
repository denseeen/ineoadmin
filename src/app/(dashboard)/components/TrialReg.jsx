"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
} from "firebase/firestore";
import { db, storage } from "../../../../script/firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ExcelJS from "exceljs";
import emailjs from "emailjs-com";

export default function TrialTable() {
  const [trials, setTrials] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // Array now
  const [showModal, setShowModal] = useState(false);
  const [editedUsers, setEditedUsers] = useState([]);
  const [editingIndexes, setEditingIndexes] = useState([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);

  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    position: "",
    department: "",
  });

  useEffect(() => {
    const fetchTrials = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "trial"));
        const trialData = [];

        for (const docSnap of querySnapshot.docs) {
          const trialId = docSnap.id;
          const trialInfo = docSnap.data();

          trialData.push({ id: trialId, ...trialInfo });
        }

        setTrials(trialData);
      } catch (error) {
        console.error("Error fetching trial data:", error);
      }
    };

    fetchTrials();
  }, []);

  const openModal = async (trial) => {
    console.log("Opening modal for trial:", trial);

    try {
      const userDetailsRef = collection(db, "trial", trial.id, "userDetails");
      const userDetailsSnap = await getDocs(userDetailsRef);

      if (!userDetailsSnap.empty) {
        // Get all userDetails as an array
        const usersData = userDetailsSnap.docs.map((doc) => ({
          id: doc.id,
          trialId: trial.id, // ✅ attach parent trialId
          ...doc.data(),
        }));

        console.log("User data:", usersData);

        setSelectedUsers(usersData);
        setShowModal(true);
        setEditedUsers(usersData);
      } else {
        console.warn("No userDetails found for trial:", trial.id);
      }
    } catch (error) {
      console.error("Failed to fetch user details: ", error);
    }
  };

  const closeModal = () => {
    setSelectedUsers([]);
    setShowModal(false);
  };

  // Action button handlers
  const handleSend = async (trial) => {
    try {
      // Sanitize companyName to match the stored filename (replace spaces with underscores, remove special chars)
      const sanitizedCompanyName = trial.companyName
        .replace(/\s+/g, "_")
        .replace(/[^\w_-]/g, "");

      // Construct filename based on your template: "<companyName>_userList.csv"
      const fileName = `${sanitizedCompanyName}_userList.csv`;

      // Reference to the file in Firebase Storage in the correct folder
      const storageRef = ref(storage, `trial/${fileName}`);

      // Get download URL of the uploaded CSV file
      const downloadURL = await getDownloadURL(storageRef);

      // Prepare email params for EmailJS
      const serviceId = "service_ciputdx";
      const templateId = "template_1va959t";
      const userId = "8nV8GppQ82RWajpEo";

      const emailParams = {
        to_email: trial.email,
        company_name: trial.companyName,
        message: `Hi ${trial.companyName},\n\nYou can download your user list Excel file by clicking the link below:\n\n${downloadURL}`,
        excel_download_link: downloadURL,
        excel_filename: fileName,
      };

      // Send email with EmailJS
      await emailjs.send(serviceId, templateId, emailParams, userId);

      alert("Email sent with Excel download link!");
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Failed to send email. Check console for details.");
    }
  };

  const handleEmail = async (trial) => {
    const confirmTransfer = confirm(
      `Are you sure you want to move "${trial.companyName}" to ontrial?`
    );

    if (!confirmTransfer) return; // Exit if not confirmed

    try {
      // Step 1: Get userDetails from the trial document
      const userDetailsRef = collection(db, "trial", trial.id, "userDetails");
      const userDetailsSnap = await getDocs(userDetailsRef);

      const userDetails = userDetailsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Step 2: Create a new document in the "ontrial" collection
      const onTrialRef = doc(db, "ontrial", trial.id); // Use same ID
      await setDoc(onTrialRef, {
        companyName: trial.companyName,
        personinCharge: trial.personinCharge,
        email: trial.email,
        contact: trial.contact,
        domainName: trial.domainName,
        timestamp: new Date(),
      });

      // Step 3: Copy userDetails into ontrial subcollection
      const userDetailsOnTrialRef = collection(
        db,
        "ontrial",
        trial.id,
        "userDetails"
      );
      for (const user of userDetails) {
        const userRef = doc(userDetailsOnTrialRef, user.id);
        await setDoc(userRef, user);
      }

      // Step 4: Delete userDetails subcollection from trial
      for (const user of userDetailsSnap.docs) {
        await deleteDoc(doc(db, "trial", trial.id, "userDetails", user.id));
      }

      // Step 5: Delete the main trial document
      await deleteDoc(doc(db, "trial", trial.id));

      // Step 6: Remove from local state so it disappears from UI
      setTrials((prev) => prev.filter((t) => t.id !== trial.id));

      alert(`"${trial.companyName}" has been successfully passed to ontrial.`);
    } catch (error) {
      console.error("Error transferring to ontrial:", error);
      alert("Failed to transfer data to ontrial. See console for details.");
    }
  };

  const handleEditUser = (user, index) => {
    handleSaveUser(index);
  };

  const handleInputChange = (index, field, value) => {
    const updatedUsers = [...editedUsers];
    updatedUsers[index] = { ...updatedUsers[index], [field]: value };
    setEditedUsers(updatedUsers);
  };

  const handleSaveUser = async (index) => {
    const user = editedUsers[index];
    const userDocRef = doc(db, "trial", user.trialId, "userDetails", user.id);

    try {
      await updateDoc(userDocRef, {
        fullName: user.fullName,
        email: user.email,
        position: user.position,
        department: user.department,
      });

      // Update displayed data too
      const updatedSelectedUsers = [...selectedUsers];
      updatedSelectedUsers[index] = user;
      setSelectedUsers(updatedSelectedUsers);

      alert("User updated successfully!");
    } catch (error) {
      console.error("Failed to update user:", error);
      alert("Update failed.");
    }
  };

  const toggleEditMode = (index) => {
    if (editingIndexes.includes(index)) {
      // Save and exit edit mode
      handleSaveUser(index);
      setEditingIndexes((prev) => prev.filter((i) => i !== index));
    } else {
      // Enter edit mode
      setEditingIndexes((prev) => [...prev, index]);
    }
  };

  // Delete handler
  const handleDeleteUser = async (user) => {
    const confirmDelete = confirm(
      `Are you sure you want to delete ${user.fullName}?`
    );
    if (confirmDelete) {
      const userDocRef = doc(db, "trial", user.trialId, "userDetails", user.id);
      await deleteDoc(userDocRef);

      // Update the UI to remove the deleted user
      setSelectedUsers((prevUsers) =>
        prevUsers.filter((u) => u.id !== user.id)
      );
    }
  };

  const handleNewUserChange = (field, value) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddUser = async () => {
    if (!newUser.fullName || !newUser.email) {
      alert("Full name and email are required.");
      return;
    }

    try {
      const userDetailsRef = collection(
        db,
        "trial",
        selectedUsers[0].trialId,
        "userDetails"
      );
      const docRef = await addDoc(userDetailsRef, newUser);
      const addedUser = {
        ...newUser,
        id: docRef.id,
        trialId: selectedUsers[0].trialId,
      };

      setSelectedUsers((prev) => [...prev, addedUser]);
      setEditedUsers((prev) => [...prev, addedUser]);
      setNewUser({ fullName: "", email: "", position: "", department: "" });
      setShowAddUserForm(false);

      alert("New user added successfully!");
    } catch (error) {
      console.error("Error adding new user:", error);
      alert("Failed to add user.");
    }
  };

  return (
    <>
    <h1 className="text-2xl font-bold mb-4 mt-4 ml-5">Trial Companies</h1>
    <div className={`bg-white rounded-xl mb-7 shadow-md p-6 w-full max-w-[97%] mx-auto ${trials.length > 7 ? "h-[390px] overflow-y-auto" : "max-h-fit"}`}>




      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead className="bg-[#03acff] text-white">
            <tr>
              <th className="py-2 px-4 text-center text-md">Company Name</th>
              <th className="py-2 px-4 text-center text-md">
                Person in Charge
              </th>
              <th className="py-2 px-4 text-center text-md">Email</th>
              <th className="py-2 px-4 text-center text-md">Contact</th>
              <th className="py-2 px-4 text-center text-md">Domain Name</th>
              <th className="py-2 px-4 text-center text-md">Action</th>
            </tr>
          </thead>
          <tbody>
            {trials.length > 0 ? (
              trials.map((trial) => (
                <tr key={trial.id} className="border-b hover:bg-gray-100">
                  <td className="py-2 px-4">
                    <span
                      className="cursor-pointer text-gray-700 hover:text-indigo-700 relative"
                      style={{
                        background:
                          "linear-gradient(to right, #4338ca 0%, #4338ca 100%)",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "0% 2px",
                        backgroundPosition: "left bottom",
                        transition: "background-size 0.3s ease-out",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundSize = "100% 2px")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundSize = "0% 2px")
                      }
                      onClick={() => openModal(trial)}
                    >
                      {trial.companyName}
                    </span>
                  </td>

                  <td className="py-2 px-4">{trial.personinCharge}</td>
                  <td className="py-2 px-4">{trial.email}</td>
                  <td className="py-2 px-4">{trial.contact}</td>
                  <td className="py-2 px-4">{trial.domainName}</td>

                  {/* Action buttons */}
                  <td className="py-2 px-4 flex gap-2">
                    <button
                      onClick={() => handleSend(trial)}
                      className="px-3 py-1 bg-[#03acff] text-white rounded hover:bg-blue-400"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => handleEmail(trial)}
                      className="px-3 py-1 bg-[#03acff] text-white rounded hover:bg-blue-400"
                    >
                      Move
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-2 px-4 text-center" colSpan="5">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && selectedUsers.length > 0 && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-white p-6 rounded shadow-md w-full max-w-md max-h-[80vh] overflow-auto">
            {/* Close button fixed inside modal, top-right */}
            <button
              onClick={closeModal}
              className="sticky top-0 right-0 float-right text-black hover:text-blue-400 font-bold text-xl leading-none z-50"
              aria-label="Close modal"
            >
              ⓧ
            </button>
            <h2 className="text-xl font-bold mb-4">User Details</h2>

            {selectedUsers.map((user, index) => {
              const isEditing = editingIndexes.includes(index);

              return (
                <div
                  key={user.id || index}
                  className="mb-4 p-3 border rounded bg-gray-50 relative"
                >
                  <div className="mb-2 flex items-center">
                    <span className="w-32 font-semibold">Full Name:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        className="flex-1 border rounded px-3 py-1"
                        value={editedUsers[index]?.fullName || ""}
                        onChange={(e) =>
                          handleInputChange(index, "fullName", e.target.value)
                        }
                      />
                    ) : (
                      <span className="text-gray-800">
                        {user.fullName || "—"}
                      </span>
                    )}
                  </div>

                  <div className="mb-2 flex items-center">
                    <span className="w-32 font-semibold">Email:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        className="flex-1 border rounded px-3 py-1"
                        value={editedUsers[index]?.email || ""}
                        onChange={(e) =>
                          handleInputChange(index, "email", e.target.value)
                        }
                      />
                    ) : (
                      <span className="text-gray-800">{user.email || "—"}</span>
                    )}
                  </div>

                  <div className="mb-2 flex items-center">
                    <span className="w-32 font-semibold">Position:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        className="flex-1 border rounded px-3 py-1"
                        value={editedUsers[index]?.position || ""}
                        onChange={(e) =>
                          handleInputChange(index, "position", e.target.value)
                        }
                      />
                    ) : (
                      <span className="text-gray-800">
                        {user.position || "—"}
                      </span>
                    )}
                  </div>

                  <div className="mb-2 flex items-center">
                    <span className="w-32 font-semibold">Department:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        className="flex-1 border rounded px-3 py-1"
                        value={editedUsers[index]?.department || ""}
                        onChange={(e) =>
                          handleInputChange(index, "department", e.target.value)
                        }
                      />
                    ) : (
                      <span className="text-gray-800">
                        {user.department || "—"}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => toggleEditMode(index)}
                      className={`text-sm px-2 py-1 ${
                        isEditing
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-yellow-500 hover:bg-yellow-600"
                      } text-white rounded`}
                    >
                      {isEditing ? "Save" : "Edit"}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="text-sm px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {!showAddUserForm && (
              <button
                onClick={() => setShowAddUserForm(true)}
                className="w-full mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Add User
              </button>
            )}

            {showAddUserForm && (
              <div className="mb-6 p-4 border rounded bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-2">New User Details</h3>
                <div className="mb-2">
                  <label className="block font-medium">Full Name</label>
                  <input
                    type="text"
                    className="w-full border px-3 py-1 rounded"
                    value={newUser.fullName}
                    onChange={(e) =>
                      handleNewUserChange("fullName", e.target.value)
                    }
                  />
                </div>
                <div className="mb-2">
                  <label className="block font-medium">Email</label>
                  <input
                    type="email"
                    className="w-full border px-3 py-1 rounded"
                    value={newUser.email}
                    onChange={(e) =>
                      handleNewUserChange("email", e.target.value)
                    }
                  />
                </div>
                <div className="mb-2">
                  <label className="block font-medium">Position</label>
                  <input
                    type="text"
                    className="w-full border px-3 py-1 rounded"
                    value={newUser.position}
                    onChange={(e) =>
                      handleNewUserChange("position", e.target.value)
                    }
                  />
                </div>
                <div className="mb-2">
                  <label className="block font-medium">Department</label>
                  <input
                    type="text"
                    className="w-full border px-3 py-1 rounded"
                    value={newUser.department}
                    onChange={(e) =>
                      handleNewUserChange("department", e.target.value)
                    }
                  />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={handleAddUser}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Save User
                  </button>
                  <button
                    onClick={() => setShowAddUserForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
