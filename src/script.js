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

addExifBtn.disabled = true;

let exifDataObj = {};
let loadedImageData = null;
let newJpegData = null;
let translations = {};
const defaultLang = "hy";

let currentExifValues = {}; // Սկզբում դատարկ է, կլցվի լեզվի բեռնումից հետո

function loadLanguage(lang) {
  return fetch(`lang/${lang}.json`)
    .then((res) => res.json())
    .then((data) => {
      translations = data;
      applyTranslations(data);
      localStorage.setItem("lang", lang);
      document.getElementById("languageSwitcher").value = lang;

      // Թարմացնենք դատարկ արժեքները նոր թարգմանությամբ
      currentExifValues = {
        author: translations.errMissing,
        description: translations.errMissing,
        userComment: translations.errMissing,
        phone: translations.errMissing,
        phoneModel: translations.errMissing,
        dateTime: translations.errMissing,
        location: translations.errMissing,
      };

      if (loadedImageData) {
        updateExifDataObj(
          translations,
          currentExifValues.author,
          currentExifValues.description,
          currentExifValues.userComment,
          currentExifValues.phone,
          currentExifValues.phoneModel,
          currentExifValues.dateTime,
          currentExifValues.location
        );
      } else {
        exifDataInfo.innerHTML = exifDataInfo.textContent =
          translations.exifDataPlaceholder || "Այստեղ կհայտնվի տվյալները...";
      }
    })
    .catch((err) => {
      console.error("Սխալ՝ լեզվի բեռնումից:", "Տվյալը բացակայում է");
    });
}

function applyTranslations(langData) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (langData[key]) el.textContent = langData[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (langData[key]) el.placeholder = langData[key];
  });

  document.querySelectorAll("[data-i18n-value]").forEach((el) => {
    const key = el.getAttribute("data-i18n-value");
    if (langData[key]) el.value = langData[key];
  });
}

document.getElementById("languageSwitcher").addEventListener("change", (e) => {
  loadLanguage(e.target.value);
});

loadLanguage(defaultLang);

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

  const maxSize = 5 * 1024 * 1024;
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

      const description = clearText(exifData["0th"][exifTags.description]);
      const phone = clearText(
        exifData["0th"][exifTags.phone] || translations.errMissing
      );
      const phoneModel = clearText(
        exifData["0th"][exifTags.phoneModel] || translations.errMissing
      );
      const dateTime = clearText(
        exifData["0th"][exifTags.dateTime] || translations.errMissing
      );
      const author = clearText(
        exifData["0th"][exifTags.author] || translations.errMissing
      );
      const userComment = clearText(
        exifData["Exif"][exifTags.userComment] || translations.errMissing
      );
      const gpsN = exifData["GPS"][exifTags.gpsN];
      const gpsE = exifData["GPS"][exifTags.gpsE];
      const location = exifTags.location(gpsN, gpsE, translations.errMissing);

      currentExifValues = {
        author,
        description,
        userComment,
        phone,
        phoneModel,
        dateTime,
        location,
      };

      updateExifDataObj(
        translations,
        author,
        description,
        userComment,
        phone,
        phoneModel,
        dateTime,
        location
      );
    } catch (error) {
      console.error("Սխալ՝ EXIF տվյալների ընթերցման ժամանակ: " + error);
      exifDataInfo.textContent = "Սխալ նկարի մշակման ժամանակ";
    }
  };
  reader.readAsDataURL(file);
});

function updateExifDataObj(
  langData,
  author,
  description,
  userComment,
  phone,
  phoneModel,
  dateTime,
  location
) {
  exifDataObj = {
    [langData.authorLabel]: author,
    [langData.descriptionLabel]: description,
    [langData.commentLabel]: userComment,
    [langData.cameraLabel]: `${phone} ${phoneModel}`,
    [langData.dateLabel]: dateTime,
    [langData.locationLabel]: location,
  };

  exifDataInfoText();
}

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
  !exifData
    ? translations.errMissing
    : exifData.replace(/\u0000/g, "").trim() || translations.errMissing;

const exifDataInfoText = () => {
  exifDataInfo.innerHTML = "";
  Object.entries(exifDataObj).forEach(([key, value]) => {
    const p = document.createElement("p");
    if (
      key === translations.locationLabel &&
      value !== translations.errMissing
    ) {
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
