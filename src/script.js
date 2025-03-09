"use strict";

import { exifTags } from "./exif-tags.js";

let fileInput = document.getElementById("file-inp"),
  imagePreview = document.getElementById("image-preview"),
  exifDataInfo = document.getElementById("exif-data-info"),
  addExifBtn = document.getElementById("add-exif-data"),
  downloadLink = document.getElementById("download-link"),
  nameFile = document.getElementById("file-name"),
  authorInput = document.getElementById("author-inp"),
  descriptionInput = document.getElementById("description-inp"),
  commentInput = document.getElementById("comment-inp");

const err = "No data available.";
addExifBtn.disabled = true;

let exifDataObj = {};

let loadedImageData;
let newJpegData;

fileInput.addEventListener("change", function (e) {
  addExifBtn.disabled = false;
  let file = e.target.files[0];

  if (!file) return;

  let reader = new FileReader();

  reader.onload = function (e) {
    try {
      let jpegData = e.target.result;
      let exifData = piexif.load(jpegData);

      loadedImageData = jpegData;
      imagePreview.src = loadedImageData;
      imagePreview.style.display = "block";
      console.dir(exifData);

      let description = clearText(exifData["0th"][exifTags.description]);
      let phone = exifData["0th"][exifTags.phone] || err;
      let phoneModel = exifData["0th"][exifTags.phoneModel] || err;
      let dateTime = exifData["0th"][exifTags.dateTime] || err;
      let author = exifData["0th"][exifTags.author] || err;
      let userComment = exifData["Exif"][exifTags.userComment] || err;
      let gpsN = exifData["GPS"][exifTags.gpsN];
      let gpsE = exifData["GPS"][exifTags.gpsE];
      let location = exifTags.location(gpsN, gpsE);

      exifDataObj["👤 Հեղինակ"] = author;
      exifDataObj["📝 Նկարագրություն"] = description;
      exifDataObj["💬 Մեկնաբանություն"] = userComment;
      exifDataObj["📷 Տեսախցիկ"] = `${phone} ${phoneModel}`;
      exifDataObj["🕒 Նկարահանման ամսաթիվ"] = dateTime;
      exifDataObj["🗺️ Տեղանք"] = location;

      // 1-8  orientation
      // exifDataObj["🧭 Կողմնորոշում"] = exifData["0th"][exifTags.orientation];

      exifDataInfoText();
    } catch (error) {
      console.error("EXIF-ի մշակման սխալ:", error);
      exifDataInfo.innerHTML = "Սխալ նկարի մշակման ժամանակ";
    }
  };
  reader.readAsDataURL(file);
});

// ADD EXIF DATA

addExifBtn.addEventListener("click", function () {
  let exifObj = piexif.load(loadedImageData);

  exifObj["0th"][exifTags.author] =
    authorInput.value.trim() || exifObj["0th"][exifTags.author];
  exifObj["0th"][exifTags.description] =
    descriptionInput.value.trim() || exifObj["0th"][exifTags.description];

  exifObj["Exif"][exifTags.userComment] =
    commentInput.value.trim() || exifObj["Exif"][exifTags.userComment];

  let exifStr = piexif.dump(exifObj);
  newJpegData = piexif.insert(exifStr, loadedImageData);

  downloadLink.style.display = "block";
  nameFile.style.display = "block";
});

downloadLink.addEventListener("click", function () {
  downloadLink.href = newJpegData;

  downloadLink.download = nameFile.value.trim() || "image.jpg";
  resetInputValue("");
});

let resetInputValue = (empty) => {
  nameFile.value = empty;
  commentInput.value = empty;
  descriptionInput.value = empty;
  authorInput.value = empty;

  downloadLink.style.display = "none";
  nameFile.style.display = "none";
};

let clearText = (exifData) => {
  if (exifData.startsWith("\u0000")) {
    return err;
  } else {
    return exifData;
  }
};

let exifDataInfoText = () => {
  exifDataInfo.textContent = "";
  Object.entries(exifDataObj).forEach(([key, value]) => {
    let p = document.createElement("p");
    if (key === "🗺️ Տեղանք" && value !== err) {
      p.textContent = `${key}: `;
      let a = document.createElement("a");
      a.textContent = value;
      p.appendChild(a);
      a.href = `https://www.google.com/maps?q=${encodeURIComponent(value)}`;
      a.target = "_blank";
      a.id = "locLink";
      exifDataInfo.appendChild(p);
      return;
    } else {
      p.textContent = `${key}: ${value}`;
    }
    exifDataInfo.appendChild(p);
  });
};
