document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('photo');
    const captureButton = document.getElementById('capture');
    const statusText = document.getElementById('status');
    const postcodeElement = document.getElementById('postcode');
    const correctedImageContainer = document.getElementById('corrected-image-container');

    function getUHVVideoStream() {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            if (videoDevices.length === 0) {
                alert('No video devices found.');
                return;
            }

            const uhvCamera = videoDevices.find(device => device.label.toLowerCase().includes('uhv')) || videoDevices[0];
            console.log('Using camera:', uhvCamera.label);

            const constraints = {
                video: {
                    deviceId: { exact: uhvCamera.deviceId }
                }
            };

            return navigator.mediaDevices.getUserMedia(constraints);
        }).then(stream => {
            video.srcObject = stream;
        }).catch(error => {
            console.error("Error accessing the UHV camera", error);
            alert("Unable to access the UHV camera. Please make sure you have granted permission.");
        });
    }

    getUHVVideoStream();

    function rotateImage(image, angle) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = image.width;
        canvas.height = image.height;

        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate(angle * Math.PI / 180);
        context.drawImage(image, -image.width / 2, -image.height / 2);

        return canvas;
    }

    function drawDetectedText(words, canvas) {
        const context = canvas.getContext('2d');
        context.strokeStyle = 'blue';
        context.lineWidth = 2;

        words.forEach(word => {
            const bbox = word.bbox;
            const x = bbox.x0;
            const y = bbox.y0;
            const w = bbox.x1 - bbox.x0;
            const h = bbox.y1 - bbox.y0;

            context.strokeRect(x, y, w, h);
        });
    }

    function onOpenCVLoaded() {
        if (typeof cv === 'undefined') {
            console.error("OpenCV.js is not loaded.");
            statusText.textContent = "Error: OpenCV.js is not loaded.";
            return;
        }

        console.log("OpenCV.js is initialized.");
        statusText.textContent = "OpenCV.js is ready. Click 'Capture Photo' to proceed.";
    }

    cv['onRuntimeInitialized'] = onOpenCVLoaded;

    captureButton.addEventListener('click', () => {
        if (typeof cv === 'undefined') {
            console.error("OpenCV.js is not loaded.");
            statusText.textContent = "Error: OpenCV.js is not loaded.";
            return;
        }

        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        console.log('Capturing photo with dimensions:', canvas.width, 'x', canvas.height);

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageDataURL = canvas.toDataURL('image/png');
        console.log('Captured image data URL:', imageDataURL);

        const img = new Image();
        img.src = imageDataURL;
        img.classList.add('captured');
        document.body.appendChild(img);

        statusText.textContent = "Processing image...";
        
        Tesseract.recognize(
            imageDataURL,
            'eng',
            {
                logger: m => console.log(m),
                tessedit_pageseg_mode: Tesseract.PSM.AUTO
            }
        ).then(({ data: { text, words } }) => {
            console.log('Recognized text:', text);
            console.log('Detected words:', words);
            statusText.textContent = "Analyzing text orientation...";

            if (Array.isArray(words) && words.length > 0) {
                const canvasForText = document.createElement('canvas');
                canvasForText.width = canvas.width;
                canvasForText.height = canvas.height;
                const contextForText = canvasForText.getContext('2d');
                contextForText.drawImage(canvas, 0, 0);

                drawDetectedText(words, canvasForText);

                let averageAngle = 0;
                let count = 0;

                words.forEach(word => {
                    const bbox = word.bbox;
                    const w = bbox.x1 - bbox.x0;
                    const h = bbox.y1 - bbox.y0;

                    if (w && h) {
                        const angle = Math.atan2(h, w) * 180 / Math.PI;
                        averageAngle += angle;
                        count++;
                    }
                });

                if (count > 0) {
                    averageAngle /= count;
                    console.log("Calculated rotation angle:", averageAngle);

                    const correctedCanvas = rotateImage(canvas, -averageAngle);
                    const correctedImageDataURL = correctedCanvas.toDataURL('image/png');

                    const correctedImg = new Image();
                    correctedImg.src = correctedImageDataURL;
                    correctedImg.classList.add('captured');
                    correctedImageContainer.innerHTML = '';
                    correctedImageContainer.appendChild(correctedImg);

                    Tesseract.recognize(
                        correctedImageDataURL,
                        'eng',
                        {
                            logger: m => console.log(m),
                            tessedit_pageseg_mode: Tesseract.PSM.AUTO
                        }
                    ).then(({ data: { text } }) => {
                        console.log('Recognized text after correction:', text);
                        statusText.textContent = "Image processed. Searching for postcode...";

                        const postcodePattern = /\b[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}\b/i;
                        const postcodeMatch = text.match(postcodePattern);

                        if (postcodeMatch) {
                            postcodeElement.textContent = postcodeMatch[0].toUpperCase();
                        } else {
                            postcodeElement.textContent = "No postcode found.";
                        }
                        statusText.textContent = "Done.";
                    }).catch(error => {
                        console.error("Error processing image with Tesseract.js", error);
                        statusText.textContent = "Error processing image.";
                    });
                } else {
                    statusText.textContent = "No text detected for rotation.";
                }
            } else {
                statusText.textContent = "Error: No words detected.";
            }
        }).catch(error => {
            console.error("Error with Tesseract.js", error);
            statusText.textContent = "Error processing image.";
        });
    });
});
