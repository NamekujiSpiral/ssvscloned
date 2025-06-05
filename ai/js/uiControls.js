// uiControls.js

let trainingPromise = null;
let stopRequested = false;
let trainedModel = null;

async function loadSavedModel() {
    try {
        const model = await tf.loadLayersModel('localstorage://my-ssv-model');
        console.log('モデルを正常に読み込みました');
        return model;
    } catch (err) {
        console.error('モデルの読み込みに失敗しました:', err);
        return null;
    }
}

// 「学習開始」ボタンを押したときの処理
document.getElementById('trainBtn').onclick = async () => {
    document.getElementById('trainBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('loadBtn').disabled = false;
    stopRequested = false;

    // trainLoop に「中止フラグ確認関数」を渡して非同期実行
    trainingPromise = (async () => {
        trainedModel = await trainLoop(() => stopRequested,trainedModel ? trainedModel : null);
        return trainedModel;
    })();

    trainingPromise.then(async () => {
        if (trainedModel) {
            await trainedModel.save('localstorage://my-ssv-model');
        }
        document.getElementById('trainBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('loadBtn').disabled = true;
    }).catch(err => {
        console.error('学習中にエラー:', err);
        document.getElementById('trainBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('loadBtn').disabled = true;
    });
};

// 「学習停止 & モデル保存」ボタンを押したときの処理
document.getElementById('stopBtn').onclick = () => {
    stopRequested = true;
    document.getElementById('stopBtn').disabled = true;
};

document.getElementById('loadBtn').onclick = async () => {
    if (!trainedModel) {
        trainedModel = await loadSavedModel();
        if (!trainedModel) {
            alert('学習済みモデルが見つかりません。先に「学習開始」でトレーニングしてください。');
            return;
        }
    }
    // 読み込んだモデルを p2 のエージェントにセット
    agent2 = trainedModel;
}

// 「人 VS AI で遊ぶ」ボタンを押したときの処理
document.getElementById('playBtn').onclick = async () => {
    if (!trainedModel) {
        trainedModel = await loadSavedModel();
        if (!trainedModel) {
            alert('学習済みモデルが見つかりません。先に「学習開始」でトレーニングしてください。');
            return;
        }
    }
    startPvPLoop(trainedModel);
};
