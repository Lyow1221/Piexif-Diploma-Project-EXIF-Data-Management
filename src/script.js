"use strict";
import { exifTags } from "./exif-tags.js";

const fileInput = document.getElementById("file-inp"),
  imagePreview = document.getElementById("image-preview"),
  exifDataInfo = document.getElementById("exif-data-info"),
  addExifBtn = document.getElementById("add-exif-data"),
  downloadLink = document.getElementById("download-link"),
  nameFile = document.getElementById("file-name"),
  authorInput = document.getElementById("author-inp"),
  descriptionInput = document.getElementById("description-inp"),
  commentInput = document.getElementById("comment-inp");

const err = "Տվյալներ առկա րե.";
addExifBtn.disabled = true;

let exifDataObj = {};
let loadedImageData = null;
let newJpegData = null;

// XSS-ը կանխելու համար. HTML-ում հատուկ սիմվոլները փոխարինելու ֆունկցիա
const escapeHTML = (str) =>
  str.replace(
    /[&<>"'`=\/]/g,
    (s) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "`": "&#96;",
        "=": "&#61;",
        "/": "&#47;",
      }[s])
  );

fileInput.addEventListener("change", async (e) => {
  addExifBtn.disabled = false;
  const file = e.target.files[0];
  if (!file) return;

  // Ստուգում ֆայլի տեսակը և չափը
  const maxSize = 5 * 1024 * 1024; // 5MB առավելաջն չափ
  if (!file.type.match(/^image\/jpeg$/)) {
    alert("Խնդրում ենք ընտրել միայն JPEG ֆորմատի նկար:");
    fileInput.value = "";
    return;
  }
  if (file.size > maxSize) {
    alert("Նկարի չափը չպետք է գերազանցի 5MB-ը:");
    fileInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jpegData = e.target.result;
      const exifData = piexif.load(jpegData);

      loadedImageData = jpegData;
      imagePreview.src = loadedImageData;
      imagePreview.style.display = "block";
      console.dir(exifData);

      const description = clearText(exifData["0th"][exifTags.description]);
      const phone = clearText(exifData["0th"][exifTags.phone] || err);
      const phoneModel = clearText(exifData["0th"][exifTags.phoneModel] || err);
      const dateTime = clearText(exifData["0th"][exifTags.dateTime] || err);
      const author = clearText(exifData["0th"][exifTags.author] || err);
      const userComment = clearText(
        exifData["Exif"][exifTags.userComment] || err
      );
      const gpsN = exifData["GPS"][exifTags.gpsN];
      const gpsE = exifData["GPS"][exifTags.gpsE];
      const location = exifTags.location(gpsN, gpsE, err);

      exifDataObj = {
        "👤 Հեղինակ": author,
        "📝 Նկարագրություն": description,
        "💬 Մեկնաբանություն": userComment,
        "📷 Տեսախցիկ": `${phone} ${phoneModel}`,
        "🕒 Նկարահանման ամսաթիվ": dateTime,
        "🗺️ Տեղանք": location,
        // "🧭 Կողմնորոշում": exifData["0th"][exifTags.orientation] || err, // 1-8 orientation
      };

      exifDataInfoText();
    } catch (error) {
      console.error("Սխալ՝ EXIF տվյալների ընթերցման ժամանակ: " + error);
      exifDataInfo.textContent = "Սխալ նկարի մշակման ժամանակ";
    }
  };
  reader.readAsDataURL(file);
});

// ADD EXIF DATA
addExifBtn.addEventListener("click", () => {
  const exifObj = piexif.load(loadedImageData);

  exifObj["0th"][exifTags.author] =
    escapeHTML(authorInput.value.trim()) || exifObj["0th"][exifTags.author];
  exifObj["0th"][exifTags.description] =
    escapeHTML(descriptionInput.value.trim()) ||
    exifObj["0th"][exifTags.description];
  exifObj["Exif"][exifTags.userComment] =
    escapeHTML(commentInput.value.trim()) ||
    exifObj["Exif"][exifTags.userComment];

  const exifStr = piexif.dump(exifObj);
  newJpegData = piexif.insert(exifStr, loadedImageData);

  downloadLink.style.display = "block";
  nameFile.style.display = "block";
});

downloadLink.addEventListener("click", () => {
  downloadLink.href = newJpegData;
  downloadLink.download = escapeHTML(nameFile.value.trim()) || "image.jpg";
  resetInputValue("");
});

const resetInputValue = (empty) => {
  nameFile.value = empty;
  commentInput.value = empty;
  descriptionInput.value = empty;
  authorInput.value = empty;
  downloadLink.style.display = "none";
  nameFile.style.display = "none";
};

const clearText = (exifData) =>
  !exifData ? err : exifData.replace(/\u0000/g, "").trim() || err;

const exifDataInfoText = () => {
  exifDataInfo.innerHTML = ""; // Clear previous entries to prevent duplicates
  Object.entries(exifDataObj).forEach(([key, value]) => {
    const p = document.createElement("p");
    if (key === "🗺️ Տեղանք" && value !== err) {
      p.textContent = `${key}: `;
      const a = document.createElement("a");
      a.textContent = value;
      a.href = `https://www.google.com/maps?q=${encodeURIComponent(value)}`;
      a.target = "_blank";
      a.id = "locLink";
      p.appendChild(a);
    } else {
      p.textContent = `${key}: ${value}`;
    }
    exifDataInfo.appendChild(p);
  });
};
