const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB씩 처리

// 프로그레스 바 업데이트
function updateProgressBar(progress) {
  const progressBar = document.getElementById("progress-bar");
  progressBar.style.width = `${progress}%`;
}

// 파일을 청크 단위로 읽고 처리하는 함수
function processChunks(reader, file, processChunkCallback, onComplete) {
  const fileSize = file.size;
  let offset = 0;

  function readNextChunk() {
    const end = Math.min(offset + CHUNK_SIZE, fileSize);
    const chunk = file.slice(offset, end);
    reader.readAsArrayBuffer(chunk); // 바이너리 데이터 읽기
  }

  reader.onload = function (e) {
    const chunkData = e.target.result;
    processChunkCallback(chunkData);

    offset += chunkData.byteLength;
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
    const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(chunk)); // 바이너리 데이터를 WordArray로 변환
    const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString(); // AES 암호화 후 Base64로 인코딩
    encryptedData.push(encrypted);
  }

  function onComplete() {
    const encryptedBlob = new Blob([encryptedData.join("\n")], {
      type: "application/octet-stream",
    });
    createDownloadLink(encryptedBlob, `${file.name}.encrypted`);
  }

  processChunks(reader, file, encryptChunk, onComplete);
}

// 파일 복호화
function decryptFile(file, key) {
  const reader = new FileReader();
  let decryptedData = [];

  function decryptChunk(chunk) {
    try {
      const encryptedText = new TextDecoder().decode(chunk); // 암호화된 텍스트 변환
      const encryptedParts = encryptedText.split("\n"); // 줄 단위 분리

      encryptedParts.forEach((part) => {
        if (!part.trim()) return; // 빈 문자열 무시

        const decryptedWordArray = CryptoJS.AES.decrypt(part, key); // AES 복호화
        const decryptedBase64 =
          CryptoJS.enc.Base64.stringify(decryptedWordArray); // Base64로 변환
        const decryptedBytes = Uint8Array.from(atob(decryptedBase64), (c) =>
          c.charCodeAt(0)
        ); // Base64 디코딩 후 Uint8Array 변환

        decryptedData.push(decryptedBytes);
      });
    } catch (error) {
      console.error("복호화 오류: ", error.message);
      alert(
        "복호화 중 오류가 발생했습니다. 파일이 손상되었거나 키가 잘못되었습니다."
      );
      throw error;
    }
  }

  function onComplete() {
    if (decryptedData.length === 0) {
      alert("복호화된 데이터가 없습니다.");
      return;
    }

    const mergedData = new Uint8Array(
      decryptedData.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;

    decryptedData.forEach((chunk) => {
      mergedData.set(chunk, offset);
      offset += chunk.length;
    });

    const blob = new Blob([mergedData], { type: file.type });
    const originalFileName = file.name.replace(/\.encrypted$/, "");
    createDownloadLink(blob, originalFileName);
  }

  processChunks(reader, file, decryptChunk, onComplete);
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
