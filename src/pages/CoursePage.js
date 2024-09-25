import React, { useState, useEffect } from "react";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  remove,
} from "firebase/database";
import "./CoursePage.css";

function CoursePage() {
  const [mainCourses, setMainCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [subCourses, setSubCourses] = useState([]);
  const [selectedSubCourse, setSelectedSubCourse] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const [answers, setAnswers] = useState([{ text: "", correct: false }]);
  const [questions, setQuestions] = useState([]);
  const [editQuestionIndex, setEditQuestionIndex] = useState(null);
  const [editAnswerIndex, setEditAnswerIndex] = useState(null);
  const [error, setError] = useState("");
  const [media, setMedia] = useState({ images: [], videos: [], pdfs: [] });
  const [newMediaLink, setNewMediaLink] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newSubCourseName, setNewSubCourseName] = useState("");

  const db = getDatabase();

  // Load main courses
  useEffect(() => {
    const coursesRef = ref(db, "courses/mainCourses");
    const unsubscribe = onValue(coursesRef, (snapshot) => {
      const coursesData = snapshot.val();
      const coursesArray = coursesData
        ? Object.keys(coursesData).map((key) => ({
            id: key,
            ...coursesData[key],
          }))
        : [];
      setMainCourses(coursesArray);
    });

    return () => unsubscribe();
  }, [db]);

  // Load sub-courses
  useEffect(() => {
    if (selectedCourse) {
      const subCoursesRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses`
      );
      const unsubscribe = onValue(subCoursesRef, (snapshot) => {
        const subCoursesData = snapshot.val();
        const subCoursesArray = subCoursesData
          ? Object.keys(subCoursesData).map((key) => ({
              id: key,
              ...subCoursesData[key],
            }))
          : [];
        setSubCourses(subCoursesArray);
        setSelectedSubCourse("");
      });

      return () => unsubscribe();
    }
  }, [db, selectedCourse]);

  // Load questions and media
  useEffect(() => {
    if (selectedCourse && selectedSubCourse) {
      const questionsRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions`
      );
      const imagesRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/images`
      );
      const videosRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/videos`
      );
      const pdfsRef = ref(
        db,
        `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/pdfs`
      );

      const unsubscribeQuestions = onValue(questionsRef, (snapshot) => {
        const questionsData = snapshot.val();
        const questionsArray = questionsData
          ? Object.keys(questionsData).map((key) => ({
              id: key,
              ...questionsData[key],
            }))
          : [];
        setQuestions(questionsArray);
      });

      const unsubscribeImages = onValue(imagesRef, (snapshot) => {
        const imagesData = snapshot.val();
        const imagesArray = imagesData ? Object.values(imagesData) : [];
        setMedia((prev) => ({ ...prev, images: imagesArray }));
      });

      const unsubscribeVideos = onValue(videosRef, (snapshot) => {
        const videosData = snapshot.val();
        const videosArray = videosData ? Object.values(videosData) : [];
        setMedia((prev) => ({ ...prev, videos: videosArray }));
      });

      const unsubscribePdfs = onValue(pdfsRef, (snapshot) => {
        const pdfsData = snapshot.val();
        const pdfsArray = pdfsData ? Object.values(pdfsData) : [];
        setMedia((prev) => ({ ...prev, pdfs: pdfsArray }));
      });

      return () => {
        unsubscribeQuestions();
        unsubscribeImages();
        unsubscribeVideos();
        unsubscribePdfs();
      };
    }
  }, [db, selectedCourse, selectedSubCourse]);

  // Add media from Dropbox link
  const handleAddMediaFromLink = () => {
    if (!newMediaLink.trim()) {
      setError("The media link cannot be empty");
      return;
    }

    let mediaType = "";
    // Checking for media types based on extensions and Dropbox URLs
    if (
      newMediaLink.endsWith(".jpg") ||
      newMediaLink.endsWith(".jpeg") ||
      newMediaLink.endsWith(".png") ||
      newMediaLink.includes("dropbox.com/scl") // Check for Dropbox image links
    ) {
      mediaType = "images";
    } else if (newMediaLink.endsWith(".mp4")) {
      mediaType = "videos";
    } else if (newMediaLink.endsWith(".pdf")) {
      mediaType = "pdfs";
    } else {
      setError("Unsupported media link format");
      return;
    }

    const mediaRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/${mediaType}`
    );
    const newMediaRef = push(mediaRef);
    set(newMediaRef, newMediaLink)
      .then(() => {
        setNewMediaLink("");
        setError("");
      })
      .catch((error) => setError("Failed to save media URL: " + error.message));
  };

  // Add or edit question
  const handleAddOrEditQuestion = () => {
    if (!newQuestion.trim()) {
      setError("The question cannot be empty");
      return;
    }

    const newQuestionObj = {
      text: newQuestion,
      answers: [...answers],
    };

    if (editQuestionIndex !== null) {
      const updatedQuestions = [...questions];
      updatedQuestions[editQuestionIndex] = newQuestionObj;
      setQuestions(updatedQuestions);
      setEditQuestionIndex(null);
    } else {
      setQuestions([...questions, newQuestionObj]);
    }

    setNewQuestion("");
    setAnswers([{ text: "", correct: false }]);
    setError("");
  };

  // Add or update answer
  const handleAddOrUpdateAnswer = () => {
    if (newAnswerText.trim() === "") {
      setError("The answer text cannot be empty");
      return;
    }

    const updatedAnswers = [...answers];
    if (editAnswerIndex !== null) {
      updatedAnswers[editAnswerIndex] = {
        text: newAnswerText,
        correct: updatedAnswers[editAnswerIndex].correct,
      };
      setEditAnswerIndex(null);
    } else {
      updatedAnswers.push({ text: newAnswerText, correct: false });
    }

    setAnswers(updatedAnswers);
    setNewAnswerText("");
    setError("");
  };

  // Edit answer
  const handleEditAnswer = (index) => {
    if (index >= 0 && index < answers.length) {
      setNewAnswerText(answers[index].text);
      setEditAnswerIndex(index);
    }
  };

  // Set correct answer
  const handleCorrectAnswerChange = (index) => {
    const updatedAnswers = answers.map((answer, i) =>
      i === index ? { ...answer, correct: !answer.correct } : answer
    );
    setAnswers(updatedAnswers);
  };

  // Edit question
  const handleEditQuestionIndex = (index) => {
    const question = questions[index];
    setNewQuestion(question.text);
    setAnswers(question.answers || []);
    setEditQuestionIndex(index);
  };

  // Delete question
  const handleDeleteQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
  };

  // Save questions
  const handleSaveQuestions = () => {
    if (!selectedSubCourse) {
      setError("Select a sub-course to save questions");
      return;
    }

    if (questions.length === 0) {
      setError("There are no questions to save");
      return;
    }

    const questionsRef = ref(
      db,
      `courses/mainCourses/${selectedCourse}/subCourses/${selectedSubCourse}/questions`
    );

    remove(questionsRef)
      .then(() => {
        Promise.all(
          questions.map((question) => {
            const questionRef = push(questionsRef);
            return set(questionRef, question);
          })
        )
          .then(() => {
            setQuestions([]);
            setError("");
          })
          .catch((error) => {
            setError("Failed to save questions: " + error.message);
          });
      })
      .catch((error) => {
        setError("Failed to clear existing questions: " + error.message);
      });
  };

  return (
    <div className="course-page">
      <h1>Course Management</h1>
      <div>
        <h2>Main Courses</h2>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          <option value="">Select Course</option>
          {mainCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <div>
          <h2>Sub-Courses</h2>
          <select
            value={selectedSubCourse}
            onChange={(e) => setSelectedSubCourse(e.target.value)}
          >
            <option value="">Select Sub-Course</option>
            {subCourses.map((subCourse) => (
              <option key={subCourse.id} value={subCourse.id}>
                {subCourse.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedSubCourse && (
        <div>
          <h2>Questions</h2>
          <ul>
            {questions.map((question, index) => (
              <li key={index}>
                {question.text}
                <button onClick={() => handleEditQuestionIndex(index)}>
                  Edit
                </button>
                <button onClick={() => handleDeleteQuestion(index)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>

          <div>
            <input
              type="text"
              placeholder="New Question"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
            />
            <ul>
              {answers.map((answer, index) => (
                <li key={index}>
                  <input
                    type="checkbox"
                    checked={answer.correct}
                    onChange={() => handleCorrectAnswerChange(index)}
                  />
                  {answer.text}
                  <button onClick={() => handleEditAnswer(index)}>Edit</button>
                </li>
              ))}
            </ul>

            <input
              type="text"
              placeholder="New Answer"
              value={newAnswerText}
              onChange={(e) => setNewAnswerText(e.target.value)}
            />
            <button onClick={handleAddOrUpdateAnswer}>
              {editAnswerIndex !== null ? "Update" : "Add"} Answer
            </button>

            <button onClick={handleAddOrEditQuestion}>
              {editQuestionIndex !== null ? "Update" : "Add"} Question
            </button>

            <button onClick={handleSaveQuestions}>Save Questions</button>

            {error && <p style={{ color: "red" }}>{error}</p>}
          </div>

          <h2>Media</h2>
          <div>
            <input
              type="text"
              placeholder="Dropbox Media Link"
              value={newMediaLink}
              onChange={(e) => setNewMediaLink(e.target.value)}
            />
            <button onClick={handleAddMediaFromLink}>Add Media</button>
            <div>
              <h3>Images</h3>
              <ul>
                {media.images.map((img, index) => (
                  <li key={index}>
                    <img
                      src={img.replace("dl=0", "raw=1")}
                      alt="Course Media"
                      style={{ width: "200px" }}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Videos</h3>
              <ul>
                {media.videos.map((vid, index) => (
                  <li key={index}>
                    <video
                      src={vid.replace("dl=0", "raw=1")}
                      controls
                      style={{ width: "400px" }}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>PDFs</h3>
              <ul>
                {media.pdfs.map((pdf, index) => (
                  <li key={index}>
                    <embed
                      src={pdf.replace("dl=0", "raw=1")}
                      type="application/pdf"
                      width="100%"
                      height="600px"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoursePage;
