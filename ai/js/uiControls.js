// uiControls.js

let trainingPromise = null;
let stopRequested = false;
let trainedModel = null;

// モデルをローカルストレージから読み込む関数
async function loadModelFromStorage() {
    try {
        const model = await tf.loadLayersModel('localstorage://my-ssv-model');
        console.log('ローカルストレージからモデルを正常に読み込みました');
        return model;
    } catch (err) {
        console.warn('ローカルストレージにモデルが見つかりませんでした。');
        return null;
    }
}

// ファイルからモデルを読み込む関数
function loadModelFromFiles(files) {
    return new Promise((resolve, reject) => {
        const jsonFile = Array.from(files).find(f => f.name.endsWith('.json'));
        const binFile = Array.from(files).find(f => f.name.endsWith('.bin'));

        if (!jsonFile || !binFile) {
            return reject(new Error('.json と .bin の両方のファイルを選択してください。'));
        }
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const model = await tf.loadLayersModel(tf.io.browserFiles([jsonFile, binFile]));
                console.log('ファイルからモデルを正常に読み込みました。');
                resolve(model);
            } catch (err) {
                reject(new Error('モデルの読み込みに失敗しました: ' + err.message));
            }
        };
        reader.onerror = (err) => reject(new Error('ファイルの読み込みに失敗しました。'));
        reader.readAsArrayBuffer(jsonFile); // JSONファイル読み込みを開始
    });
}


// UIの有効/無効状態を管理する関数
function setTrainingUIState(isTraining) {
    document.getElementById('trainBtn').disabled = isTraining;
    document.getElementById('stopBtn').disabled = !isTraining;
    document.getElementById('loadBtn').disabled = isTraining;
    document.getElementById('modelUpload').disabled = isTraining;
    document.getElementById('playBtn').disabled = isTraining;
}

// 「学習開始」ボタン
document.getElementById('trainBtn').onclick = async () => {
    setTrainingUIState(true);
    stopRequested = false;

    trainingPromise = trainLoop(() => stopRequested, trainedModel)
        .then(model => {
            trainedModel = model;
            console.log('学習が完了または停止しました。');
            if (trainedModel) {
                // 学習結果をローカルストレージに自動保存
                return trainedModel.save('localstorage://my-ssv-model');
            }
        })
        .then(() => {
            console.log('モデルがローカルストレージに保存されました。');
            // trainedModelをダウンロードさせる
            return trainedModel.save('downloads://ssv-ai-model');
        })
        .then(() => {
             console.log('モデルのダウンロードが開始されました。');
        })
        .catch(err => {
            console.error('学習または保存中にエラーが発生しました:', err);
        })
        .finally(() => {
            setTrainingUIState(false);
            trainingPromise = null;
        });
};

// 「学習停止 & モデル保存」ボタン
document.getElementById('stopBtn').onclick = () => {
    if (trainingPromise) {
        stopRequested = true;
        document.getElementById('stopBtn').innerText = '停止中...';
        document.getElementById('stopBtn').disabled = true;
    }
};

// 「モデルロード」ボタン
document.getElementById('loadBtn').onclick = async () => {
    trainedModel = await loadModelFromStorage();
    if (trainedModel) {
        alert('ローカルストレージからモデルをロードしました。');
    } else {
        alert('ロードできるモデルがローカルストレージに見つかりません。');
    }
};

// モデルアップロード用のinput
document.getElementById('modelUpload').onchange = async (event) => {
    if (event.target.files.length === 0) return;

    try {
        trainedModel = await loadModelFromFiles(event.target.files);
        alert('ファイルからモデルを正常にロードしました。');
    } catch (err) {
        alert(err.message);
        console.error(err);
    } finally {
        // inputをリセットして同じファイルを再度選択できるようにする
        event.target.value = '';
    }
};


// 「人 VS AI で遊ぶ」ボタン
document.getElementById('playBtn').onclick = () => {
    if (!trainedModel) {
        alert('学習済みモデルがありません。「モデルロード」または「学習開始」を先に行ってください。');
        return;
    }
    
    // game.jsで定義されたグローバル関数を呼び出す
    if (window.startPvAILoop) {
        window.startPvAILoop(trainedModel);
    } else {
        console.error('startPvAILoop関数が定義されていません。');
    }
};

// 初期UI状態設定
setTrainingUIState(false);