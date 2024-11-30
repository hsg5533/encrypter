const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB씩 처리

// 프로그레스 바 업데이트
function updateProgressBar(progress) {
  const progressBar = document.getElementById("progress-bar");
  progressBar.style.width = `${progress}%`;
}

// 파일을 청크 단위로 읽고 처리하는 함수
function processChunks(reader, file, key, processChunkCallback, onComplete) {
  const fileSize = file.size;
  let offset = 0;

  function readNextChunk() {
    const end = Math.min(offset + CHUNK_SIZE, fileSize);
    const chunk = file.slice(offset, end);
    reader.readAsText(chunk); // 텍스트로 읽기
  }

  reader.onload = function (e) {
    const chunkData = e.target.result;
    processChunkCallback(chunkData);

    offset += chunkData.length;
    updateProgressBar((offset / fileSize) * 100); // 프로그레스 바 업데이트

    if (offset < fileSize) {
      readNextChunk(); // 다음 청크 읽기
    } else {
      onComplete(); // 처리 완료
    }
  };

  readNextChunk(); // 첫 번째 청크 처리
}

// 파일 암호화
function encryptFile(file, key) {
  const reader = new FileReader();
  let encryptedData = [];

  function encryptChunk(chunk) {
    const wordArray = CryptoJS.enc.Utf8.parse(chunk);
    const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();
    encryptedData.push(encrypted);
  }

  function onComplete() {
    const encryptedBlob = new Blob([encryptedData.join("")], {
      type: "application/octet-stream",
    });
    createDownloadLink(encryptedBlob, `${file.name}.encrypted`);
  }

  processChunks(reader, file, key, encryptChunk, onComplete);
}

// 파일 복호화
function decryptFile(file, key) {
  const reader = new FileReader();
  let decryptedData = [];

  function decryptChunk(chunk) {
    try {
      // Base64 디코딩 후 복호화
      const decrypted = CryptoJS.AES.decrypt(chunk, key).toString(
        CryptoJS.enc.Utf8
      );
      if (decrypted) {
        decryptedData.push(decrypted);
      } else {
        throw new Error("복호화 실패");
      }
    } catch (error) {
      console.log(error);
      alert("복호화 오류가 발생했습니다: " + error.message);
    }
  }

  function onComplete() {
    const decryptedBlob = new Blob([decryptedData.join("")], {
      type: "text/plain",
    });
    // 원본 파일명에서 .encrypted 확장자만 제거
    const originalFileName = file.name.replace(/\.encrypted$/, "");
    createDownloadLink(decryptedBlob, originalFileName);
  }

  processChunks(reader, file, key, decryptChunk, onComplete);
}

// 다운로드 링크 생성
function createDownloadLink(blob, filename) {
  const downloadLink = document.getElementById("download-link");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = filename;
  downloadLink.textContent = `${filename} 다운로드`;
  downloadLink.classList.remove("hidden");
}

// 파일 선택 후 이름 표시
document.getElementById("file-input").addEventListener("change", function () {
  const file = this.files[0];
  if (file) {
    document.getElementById(
      "file-name"
    ).textContent = `선택된 파일: ${file.name}`;
  }
});

// 암호화 버튼 클릭
document.getElementById("encrypt-button").addEventListener("click", () => {
  const fileInput = document.getElementById("file-input");
  const keyInput = document.getElementById("key-input");
  const file = fileInput.files[0];
  const key = keyInput.value;

  if (!file || !key) {
    alert("파일과 키를 입력하세요.");
    return;
  }

  encryptFile(file, key);
});

// 복호화 버튼 클릭
document.getElementById("decrypt-button").addEventListener("click", () => {
  const fileInput = document.getElementById("file-input");
  const keyInput = document.getElementById("key-input");
  const file = fileInput.files[0];
  const key = keyInput.value;

  if (!file || !key) {
    alert("파일과 키를 입력하세요.");
    return;
  }

  decryptFile(file, key);
});
