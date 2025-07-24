"use client";

import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../../script/firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../../../script/firebaseConfig"; // adjust if needed
import emailjs from "@emailjs/browser";

export default function OnTrial() {
  const [trials, setTrials] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editedUsers, setEditedUsers] = useState([]);
  const [editingIndexes, setEditingIndexes] = useState([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  //Email Btn
  const [excelFile, setExcelFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState([]);

  //Text Btn
  const [csvDownloadURL, setCsvDownloadURL] = useState(null);

  const [companies, setCompanies] = useState([]);

  const [emailAutomation, setEmailAutomation] = useState({});


//   const [emailAutomation, setEmailAutomation] = useState(() => {
//     const stored = localStorage.getItem("emailAutomation");
//     return stored ? JSON.parse(stored) : {};
//   });

//   const [emailScheduler, setEmailScheduler] = useState({
//   isRunning: false,
//   startDate: null,
//   intervalIds: [],
// });

  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    position: "",
    department: "",
  });

  useEffect(() => {
    const fetchOnTrials = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "ontrial"));
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

    fetchOnTrials();
  }, []);

  const openModal = async (ontrial) => {
  console.log("Opening modal for trial:", ontrial);

  // Reset modal-related states
  setSelectedUsers([]);
  setEditedUsers([]);
  setCsvDownloadURL(null);
  setSelectedCompany(ontrial); // ✅ Set the selected company here

  try {
    const userDetailsRef = collection(db, "ontrial", ontrial.id, "userDetails");
    const userDetailsSnap = await getDocs(userDetailsRef);

    if (!userDetailsSnap.empty) {
      const usersData = userDetailsSnap.docs.map((doc) => ({
        id: doc.id,
        trialId: ontrial.id,
        ...doc.data(),
      }));

      setSelectedUsers(usersData);
      setEditedUsers(usersData);
    } else {
      console.warn("No userDetails found for trial:", ontrial.id);
    }

    // Fetch CSV
    const fileName = `${ontrial.companyName.toLowerCase().replace(/\s+/g, "_")}_userLogins.csv`;
    const fileRef = ref(storage, `onTrial/${fileName}`);
    try {
      const url = await getDownloadURL(fileRef);
      setCsvDownloadURL(url);
    } catch (err) {
      console.warn("No CSV file found in storage for this company:", err);
      setCsvDownloadURL(null);
    }

    setShowModal(true);
  } catch (error) {
    console.error("Failed to fetch user details: ", error);
  }
};
  
   const openEmailModal = (company) => {
    setSelectedCompany(company);
    setShowEmailModal(true);
  };

  const closeModal = () => {
    setSelectedUsers([]);
    setShowModal(false);
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setSelectedCompany(null);
  };

  const handleInputChange = (index, field, value) => {
    const updatedUsers = [...editedUsers];
    updatedUsers[index] = { ...updatedUsers[index], [field]: value };
    setEditedUsers(updatedUsers);
  };

  const handleSaveUser = async (index) => {
    const user = editedUsers[index];
    const userDocRef = doc(db, "ontrial", user.trialId, "userDetails", user.id);

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
      const userDocRef = doc(
        db,
        "ontrial",
        user.trialId,
        "userDetails",
        user.id
      );
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
        "ontrial",
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

 // New: handleExcelChange to load Excel into preview only
const handleExcelChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      setExcelPreview(data);
      setExcelFile(file); // Save for later upload
    };
    reader.readAsBinaryString(file);
  } catch (err) {
    console.error("Failed to read Excel:", err);
  }
};

// EmailJS credentials
const EMAILJS_SERVICE_ID = 'service_uib9qrj';
const EMAILJS_TEMPLATE_ID = 'template_x81kv7h';
const EMAILJS_USER_ID = '8nV8GppQ82RWajpEo';

const handleSaveExcel = async () => {
  if (!excelFile || !selectedCompany) {
    alert("No Excel file loaded or company not selected.");
    return;
  }

  try {
    const data = await excelFile.arrayBuffer();
    const workbook = XLSX.read(data);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const csvBlob = new Blob([csv], { type: "text/csv" });

    const fileName = `${selectedCompany.companyName.toLowerCase().replace(/\s+/g, "_")}_userLogins.csv`;
    const fileRef = ref(storage, `onTrial/${fileName}`);

    await uploadBytes(fileRef, csvBlob);
    const downloadURL = await getDownloadURL(fileRef); // Get public URL

    alert("CSV file uploaded to Firebase Storage successfully!");

    // Send Email via EmailJS with download URL
    const templateParams = {
      company_name: selectedCompany.companyName,
      excel_download_link: downloadURL,
      to_email: selectedCompany.email || "admin@example.com",
    };

    console.log("Template Params:", templateParams);
      emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_USER_ID
      )

      .then((response) => {
        console.log("Email sent successfully!", response.status, response.text);
        alert("Email with download link sent!");
      })
      .catch((error) => {
        console.error("Email failed to send:", error);
        alert("Failed to send email.");
      });

    setExcelFile(null);
    setExcelPreview([]);

  } catch (err) {
    console.error("Upload failed:", err);
    alert("Upload failed.");
  }
};

const startEmailAutomation = async (company) => {
  const companyName = company.companyName;
  const now = new Date();
  const intervalIds = [];

  const scheduleSteps = [
    // { label: "initial", delayInMs: 30 * 1000 },
    // { label: "1min", delayInMs: 60 * 1000 },
    // { label: "2min", delayInMs: 2 * 60 * 1000 },
    // { label: "3min", delayInMs: 3 * 60 * 1000 },
    { label: "day7", delayInMs: 7 * 24 * 60 * 60 * 1000 },
    { label: "day15", delayInMs: 15 * 24 * 60 * 60 * 1000 },
    { label: "day30", delayInMs: 30 * 24 * 60 * 60 * 1000 },
  ];

  scheduleSteps.forEach(({ label, delayInMs }) => {
    const id = setTimeout(() => {
      const templateParams = {
        company_name: companyName,
        to_email: company.email || "admin@example.com",
        message: `This is your automated reminder (${label}).`,
      };

      emailjs
        .send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_USER_ID
        )
        .then((res) => {
          console.log(`Email sent for ${label}`, res.status);
        })
        .catch((err) => {
          console.error(`Failed to send email for ${label}`, err);
        });
    }, delayInMs);

    intervalIds.push(id);
  });

  await setDoc(doc(db, "automationStatus", company.id), {
    isRunning: true,
    startDate: now.toISOString(),
    companyId: company.id,
  });

  setEmailAutomation((prev) => ({
    ...prev,
    [company.id]: {
      isRunning: true,
      startDate: now,
      intervalIds,
    },
  }));

  alert(`Email automation started for ${companyName}. First email in 7th day.`);
};


  const stopEmailAutomation = async (companyId) => {
    emailScheduler.intervalIds.forEach((id) => clearTimeout(id));

    await deleteDoc(doc(db, "automationStatus", companyId));

    setEmailScheduler({
      isRunning: false,
      startDate: null,
      intervalIds: [],
      companyId: null,
    });

    alert("Email automation stopped.");
  };

  useEffect(() => {
  const fetchAutomationStatuses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "automationStatus"));
      const automationMap = {};

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        automationMap[data.companyId] = {
          isRunning: true,
          startDate: new Date(data.startDate),
          intervalIds: [],
        };
      });

      setEmailAutomation(automationMap);
    } catch (error) {
      console.error("Error restoring automation statuses:", error);
    }
  };

  fetchAutomationStatuses();
}, []);


//Automation: 7, 15, 30

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
              {/* <th className="py-2 px-4 text-center text-md">Action</th> */}
            </tr>
          </thead>
          <tbody>
            {trials.length > 0 ? (
              trials.map((ontrial) => (
                <tr key={ontrial.id} className="border-b hover:bg-gray-100">
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
                      onClick={() => openModal(ontrial)}
                    >
                      {ontrial.companyName}
                    </span>
                  </td>

                  <td className="py-2 px-4">{ontrial.personinCharge}</td>
                  <td className="py-2 px-4">{ontrial.email}</td>
                  <td className="py-2 px-4">{ontrial.contact}</td>
                  <td className="py-2 px-4">{ontrial.domainName}</td>
                  <td className="py-2 px-4 text-center justify-center space-x-2">
                    <button
                      onClick={() => openEmailModal(ontrial)}
                      className="bg-[#03acff] hover:bg-blue-500 text-white px-3 py-1 rounded"
                    >
                      Email
                    </button>

                     {/* Start/Stop Email Automation Button */}
          {emailAutomation[ontrial.id]?.isRunning ? (
  <button
    onClick={() => stopEmailAutomation(ontrial.id)}
    className="bg-red-500 text-white px-4 py-1 rounded"
  >
    Stop
  </button>
) : (
  <button
    onClick={() => startEmailAutomation(ontrial)}
    className="bg-green-500 text-white px-4 py-1 rounded"
  >
    Start
  </button>
)}


                  </td>
                  {/* Action buttons */}
                  {/* <td className="py-2 px-4 flex gap-2">
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
                      Email
                    </button>
                  </td> */}
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
            <h2 className="text-lg font-semibold text-gray-700">
          {selectedCompany?.companyName || "Company Details"}
        </h2>
            <button
              onClick={closeModal}
              className="sticky -mt-7 top-0 right-0 float-right text-black hover:text-blue-400 font-bold text-xl leading-none z-50"
              aria-label="Close modal"
            >
              ⓧ
            </button>

            {csvDownloadURL ? (
            <div className="flex justify-center mt-7 mb-4 p-4 bg-blue-100 border border-blue-300 rounded">
              {/* <p className="font-medium mb-1">
                Download Excel:
              </p> */}
              <a
                href={csvDownloadURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-700 underline hover:text-blue-800 text-md"
              >
                {selectedUsers[0]?.companyName?.replace(/\s+/g, "_")}Click to download userLogins excel file
                
              </a>
            </div>
          ) : (
            <div className="flex justify-center mt-7 mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
              <p className="text-yellow-800">
                No CSV file uploaded for this company.
              </p>
            </div>
          )}


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

      {/* Email Modal */}
      {showEmailModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded max-w-md w-full">
            <button
              onClick={closeEmailModal}
              className="float-right text-xl font-bold"
              aria-label="Close"
            >
              ⓧ
            </button>

            <h2 className="text-xl font-bold mb-4">Upload Excel for {selectedCompany.companyName}</h2>

            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelChange}
              className="text-indigo-700"
            />

            {/* Show preview count if loaded */}
            {excelPreview.length > 0 && (
              <p className="mt-2 text-green-600">{excelPreview.length} rows loaded from Excel</p>
            )}

            <button
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
              onClick={handleSaveExcel}
            >
              Save Excel to Firebase Storage
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
